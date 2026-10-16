"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isISODate, todayISO } from "@/lib/dates";
import { describeSession } from "@/lib/describe";
import { buildStructure, type EditPayload } from "@/lib/edit";
import { canMarkDone, doneReason, moveBlockedReason } from "@/lib/rules";
import { createClient } from "@/lib/supabase/server";
import type { SportSlug, Status } from "@/lib/types";

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

/** Guarda los cambios de una sesión pendiente. El día no se toca aquí: se mueve con «Mover». */
export async function updateSession(id: string, payload: EditPayload): Promise<ActionResult> {
  if (!UUID.test(id) || !payload || typeof payload !== "object") {
    return { ok: false, error: "No se pudo guardar." };
  }

  const supabase = await createClient();
  const { data: current, error: readError } = await supabase
    .from("sessions")
    .select("id, status, target, structure, sports(slug)")
    .eq("id", id)
    .maybeSingle();
  if (readError || !current) return { ok: false, error: "No encontramos la sesión." };
  if (current.status !== "pendiente") {
    return { ok: false, error: "Solo se editan sesiones pendientes." };
  }

  const sportRel = current.sports as unknown as { slug: SportSlug } | { slug: SportSlug }[] | null;
  const sport = (Array.isArray(sportRel) ? sportRel[0]?.slug : sportRel?.slug) ?? "running";

  const built = buildStructure(sport, (current.structure ?? {}) as Record<string, unknown>, payload);
  if (!built.ok) return { ok: false, error: built.error };

  // La línea de objetivo se mantiene al día con lo que se editó.
  const card = describeSession(sport, built.structure, null).card;
  const target = [card.lead, card.side].filter(Boolean).join(" · ") || current.target;

  const { data: updated, error } = await supabase
    .from("sessions")
    .update({
      name: built.name,
      scheduled_time: built.time,
      notes: built.notes,
      structure: built.structure,
      target,
      updated_at: new Date().toISOString(),
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
