"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addDays, isISODate, todayISO, weekStart } from "@/lib/dates";
import type { EditPayload } from "@/lib/edit";
import { canMarkDone, doneReason, moveBlockedReason } from "@/lib/rules";
import { createClient } from "@/lib/supabase/server";
import {
  WEEK_COLUMNS,
  editedFields,
  followingWeeksOfMonth,
  loadTemplate,
  sportOfRow,
  writeWeek,
  type WeekRow,
} from "@/lib/weekplan";
import type { Status } from "@/lib/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// "movida" no se elige a mano: la crea el flujo de mover.
const SETTABLE: Status[] = ["pendiente", "hecha", "dificultad", "omitida"];

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/** Cambia el estado de una sesión aplicando las reglas del diseño. */
export async function setStatus(id: string, status: Status): Promise<ActionResult> {
  if (!UUID.test(id) || !SETTABLE.includes(status)) {
    return { ok: false, error: "No se pudo cambiar el estado." };
  }

  const supabase = await createClient();
  const { data: current, error: readError } = await supabase
    .from("sessions")
    .select("id, status, scheduled_date")
    .eq("id", id)
    .maybeSingle();
  if (readError || !current) return { ok: false, error: "No encontramos la sesión." };

  if (current.status === "movida") {
    return { ok: false, error: "Una sesión movida no cambia de estado; mira la nueva." };
  }
  if ((status === "hecha" || status === "dificultad") && !canMarkDone(current.scheduled_date, todayISO())) {
    return { ok: false, error: doneReason(current.scheduled_date, todayISO()) ?? "Todavía no se puede marcar." };
  }

  const now = new Date().toISOString();
  const { data: updated, error } = await supabase
    .from("sessions")
    .update({
      status,
      status_changed_at: now,
      updated_at: now,
      // El motivo solo vale mientras la sesión sigue omitida.
      ...(status === "omitida" ? {} : { skip_reason: null }),
    })
    .eq("id", id)
    .select("id");
  if (error || !updated?.length) return { ok: false, error: "No se pudo guardar. Intenta de nuevo." };

  revalidatePath("/", "layout");
  return { ok: true };
}

export type MoveResult =
  | { ok: true; copyId?: string }
  | { ok: false; error: string };

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Lleva una sesión a otro día u hora (por ejemplo, al arrastrarla en la semana).
 * - Mismo día: solo cambia la hora; no hay copia.
 * - Otro día: «Mover» duplica la sesión en el nuevo día y deja la original como «movida».
 */
export async function moveSession(id: string, date: string, time: string | null): Promise<MoveResult> {
  if (!UUID.test(id) || !isISODate(date) || (time !== null && !TIME.test(time))) {
    return { ok: false, error: "No se pudo mover la sesión." };
  }

  const supabase = await createClient();
  const { data: s, error: readError } = await supabase
    .from("sessions")
    .select(
      "id, plan_id, sport_id, name, scheduled_date, scheduled_time, day_order, week_number, status, target, structure, notes, moved_from_id",
    )
    .eq("id", id)
    .maybeSingle();
  if (readError || !s) return { ok: false, error: "No encontramos la sesión." };
  if (s.status !== "pendiente") return { ok: false, error: "Solo se mueven sesiones pendientes." };

  const now = new Date().toISOString();

  // Mismo día: es solo un cambio de hora.
  if (s.scheduled_date === date) {
    const { data: updated, error } = await supabase
      .from("sessions")
      .update({ scheduled_time: time, updated_at: now })
      .eq("id", id)
      .select("id");
    if (error || !updated?.length) return { ok: false, error: "No se pudo guardar. Intenta de nuevo." };
    revalidatePath("/", "layout");
    return { ok: true };
  }

  const blocked = moveBlockedReason({
    fromDate: s.scheduled_date,
    toDate: date,
    today: todayISO(),
    isCopy: !!s.moved_from_id,
  });
  if (blocked) return { ok: false, error: blocked };

  // 1) la copia en el nuevo día
  const { data: copy, error: copyError } = await supabase
    .from("sessions")
    .insert({
      plan_id: s.plan_id,
      sport_id: s.sport_id,
      name: s.name,
      scheduled_date: date,
      scheduled_time: time,
      day_order: s.day_order,
      week_number: s.week_number,
      status: "pendiente",
      target: s.target,
      structure: s.structure,
      notes: s.notes,
      moved_from_id: s.id,
    })
    .select("id")
    .single();
  if (copyError || !copy) return { ok: false, error: "No se pudo mover. Intenta de nuevo." };

  const undoCopy = async () => {
    await supabase.from("sessions").delete().eq("id", copy.id);
  };

  // 2) la original queda como movida
  const { data: marked, error: markError } = await supabase
    .from("sessions")
    .update({ status: "movida", status_changed_at: now, updated_at: now })
    .eq("id", s.id)
    .eq("status", "pendiente")
    .select("id");
  if (markError || !marked?.length) {
    await undoCopy();
    return { ok: false, error: "No se pudo mover. Intenta de nuevo." };
  }

  // 3) el registro del movimiento
  const { error: logError } = await supabase.from("session_moves").insert({
    original_session_id: s.id,
    duplicate_session_id: copy.id,
    from_date: s.scheduled_date,
    from_time: s.scheduled_time,
    to_date: date,
    to_time: time,
  });
  if (logError) {
    await supabase
      .from("sessions")
      .update({ status: "pendiente", status_changed_at: now, updated_at: now })
      .eq("id", s.id);
    await undoCopy();
    return { ok: false, error: "No se pudo mover. Intenta de nuevo." };
  }

  revalidatePath("/", "layout");
  return { ok: true, copyId: copy.id };
}

/** Deshace un movimiento: la copia desaparece y la original vuelve a pendiente. */
export async function undoMove(copyId: string): Promise<ActionResult> {
  if (!UUID.test(copyId)) return { ok: false, error: "No se pudo deshacer." };

  const supabase = await createClient();
  const { data: copy } = await supabase
    .from("sessions")
    .select("id, status, moved_from_id")
    .eq("id", copyId)
    .maybeSingle();
  if (!copy?.moved_from_id) return { ok: false, error: "No encontramos el movimiento." };
  if (copy.status !== "pendiente") {
    return { ok: false, error: "La nueva sesión ya cambió de estado; no se puede deshacer." };
  }

  const now = new Date().toISOString();
  const { data: restored, error: restoreError } = await supabase
    .from("sessions")
    .update({ status: "pendiente", status_changed_at: now, updated_at: now })
    .eq("id", copy.moved_from_id)
    .eq("status", "movida")
    .select("id");
  if (restoreError || !restored?.length) return { ok: false, error: "No se pudo deshacer." };

  // El registro en session_moves se borra solo junto con la copia.
  const { error: deleteError } = await supabase.from("sessions").delete().eq("id", copy.id);
  if (deleteError) {
    await supabase
      .from("sessions")
      .update({ status: "movida", status_changed_at: now, updated_at: now })
      .eq("id", copy.moved_from_id);
    return { ok: false, error: "No se pudo deshacer." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

/* ---------- Semanas ---------- */

export type WeekOutcome = { start: string; created: number; skipped?: string };

export type WeekSavePayload = {
  /** Sesiones de la semana tal como quedan: las que ya existen (id) y las agregadas desde otra rutina (templateId). */
  sessions: { id: string | null; templateId?: string | null; day: number; edit: EditPayload }[];
  /** Sesiones pendientes que se quitan de la semana. */
  removed: string[];
  /** Copiar el resultado a las semanas siguientes del mes, reemplazando sus rutinas pendientes. */
  propagate: boolean;
};

export type WeekSaveResult = { ok: true; weeks: WeekOutcome[] } | { ok: false; error: string };

const isMonday = (iso: string) => isISODate(iso) && weekStart(iso) === iso;

/**
 * Guarda la edición de una semana: estructura (día, hora, qué rutinas) y valores de cada rutina.
 * Con `propagate`, las semanas siguientes del mes quedan iguales a esta; lo hecho, omitido o movido
 * no se pisa nunca (esas semanas se saltan y se avisa).
 */
export async function saveWeek(start: string, payload: WeekSavePayload): Promise<WeekSaveResult> {
  if (!isMonday(start) || !payload || !Array.isArray(payload.sessions) || !Array.isArray(payload.removed)) {
    return { ok: false, error: "No se pudo guardar la semana." };
  }
  if (payload.sessions.length > 40) return { ok: false, error: "Demasiadas rutinas en una semana." };

  const supabase = await createClient();
  const { data, error: readError } = await supabase
    .from("sessions")
    .select(WEEK_COLUMNS)
    .gte("scheduled_date", start)
    .lte("scheduled_date", addDays(start, 6));
  if (readError) return { ok: false, error: "No se pudo leer la semana." };
  const rows = new Map(((data ?? []) as unknown as WeekRow[]).map((r) => [r.id, r]));

  const stale = "La semana cambió mientras la editabas. Vuelve a abrirla e inténtalo de nuevo.";
  const updates: { id: string; date: string; f: Extract<ReturnType<typeof editedFields>, { ok: true }> }[] = [];
  const inserts: Record<string, unknown>[] = [];
  const kept = new Set<string>();
  let weekNumber: number | null = null;
  for (const r of rows.values()) if (r.week_number !== null) weekNumber = r.week_number;

  for (const [i, item] of payload.sessions.entries()) {
    const label = item.edit?.name?.trim() ? `«${item.edit.name.trim()}»` : `La rutina ${i + 1}`;
    if (!Number.isInteger(item.day) || item.day < 0 || item.day > 6 || !item.edit) {
      return { ok: false, error: `${label}: el día no es válido.` };
    }
    const date = addDays(start, item.day);

    if (item.id) {
      if (!UUID.test(item.id) || kept.has(item.id)) return { ok: false, error: stale };
      const row = rows.get(item.id);
      if (!row || row.status !== "pendiente") return { ok: false, error: stale };
      const f = editedFields(sportOfRow(row), row, item.edit);
      if (!f.ok) return { ok: false, error: `${label}: ${f.error}` };
      kept.add(item.id);
      updates.push({ id: item.id, date, f });
    } else {
      const tid = item.templateId ?? "";
      if (!UUID.test(tid)) return { ok: false, error: `${label}: no se encontró la rutina de origen.` };
      const { data: t } = await supabase.from("sessions").select(WEEK_COLUMNS).eq("id", tid).maybeSingle();
      if (!t) return { ok: false, error: `${label}: no se encontró la rutina de origen.` };
      const tpl = t as unknown as WeekRow;
      const f = editedFields(sportOfRow(tpl), tpl, item.edit);
      if (!f.ok) return { ok: false, error: `${label}: ${f.error}` };
      inserts.push({
        plan_id: tpl.plan_id,
        sport_id: tpl.sport_id,
        name: f.name,
        scheduled_date: date,
        scheduled_time: f.time,
        day_order: 50 + i,
        week_number: weekNumber,
        status: "pendiente",
        target: f.target,
        structure: f.structure,
        notes: f.notes,
      });
    }
  }

  for (const id of payload.removed) {
    const row = UUID.test(id) ? rows.get(id) : undefined;
    if (!row || row.status !== "pendiente" || kept.has(id)) return { ok: false, error: stale };
  }
  // Las pendientes que no vienen en la lista ni se quitaron explícitamente tampoco se tocan.

  const now = new Date().toISOString();
  for (const u of updates) {
    const { data: done, error } = await supabase
      .from("sessions")
      .update({
        name: u.f.name,
        scheduled_date: u.date,
        scheduled_time: u.f.time,
        notes: u.f.notes,
        structure: u.f.structure,
        target: u.f.target,
        updated_at: now,
      })
      .eq("id", u.id)
      .eq("status", "pendiente")
      .select("id");
    if (error || !done?.length) return { ok: false, error: "No se pudo guardar una de las rutinas. Revisa la semana." };
  }
  if (inserts.length) {
    const { error } = await supabase.from("sessions").insert(inserts);
    if (error) return { ok: false, error: "No se pudieron agregar las rutinas nuevas." };
  }
  if (payload.removed.length) {
    const { error } = await supabase.from("sessions").delete().in("id", payload.removed);
    if (error) return { ok: false, error: "No se pudieron quitar algunas rutinas." };
  }

  const weeks: WeekOutcome[] = [];
  if (payload.propagate) {
    const template = await loadTemplate(supabase, start);
    for (const [k, w] of followingWeeksOfMonth(start).entries()) {
      const res = await writeWeek(supabase, w, template, k + 1, "replace");
      weeks.push(res.ok ? { start: w, created: res.created } : { start: w, created: 0, skipped: res.reason });
    }
  }

  revalidatePath("/", "layout");
  return { ok: true, weeks };
}

/**
 * Crea una semana vacía y las siguientes del mes copiando la semana anterior.
 * Las semanas que ya tienen rutinas no se tocan.
 */
export async function createWeeks(start: string): Promise<WeekSaveResult> {
  if (!isMonday(start)) return { ok: false, error: "No se pudo crear la semana." };

  const supabase = await createClient();
  const template = await loadTemplate(supabase, addDays(start, -7));
  if (!template.length) return { ok: false, error: "La semana anterior no tiene rutinas para copiar." };

  const weeks: WeekOutcome[] = [];
  for (const [k, w] of [start, ...followingWeeksOfMonth(start)].entries()) {
    const res = await writeWeek(supabase, w, template, k + 1, "create");
    if (!res.ok) return { ok: false, error: res.reason };
    weeks.push(res.created ? { start: w, created: res.created } : { start: w, created: 0, skipped: "ya tenía rutinas" });
  }

  revalidatePath("/", "layout");
  return { ok: true, weeks };
}
