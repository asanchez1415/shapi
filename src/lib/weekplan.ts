import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, weekDays } from "./dates";
import { describeSession } from "./describe";
import { buildStructure, type EditPayload } from "./edit";
import type { SportSlug } from "./types";

// Semanas del plan: la semana «tipo» que se copia hacia adelante y la edición con efecto
// en las semanas siguientes del mes. Funciones puras y consultas; las reglas de quién puede
// qué siguen en las acciones de servidor y en las políticas RLS.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type J = Record<string, any>;

export const WEEK_COLUMNS =
  "id, plan_id, sport_id, name, scheduled_date, scheduled_time, day_order, week_number, status, target, structure, notes, moved_from_id, sports(slug)";

export type WeekRow = {
  id: string;
  plan_id: string | null;
  sport_id: string;
  name: string;
  scheduled_date: string;
  scheduled_time: string | null;
  day_order: number | null;
  week_number: number | null;
  status: string;
  target: string | null;
  structure: unknown;
  notes: string | null;
  moved_from_id: string | null;
  sports: { slug: SportSlug } | { slug: SportSlug }[] | null;
};

export function sportOfRow(r: Pick<WeekRow, "sports">): SportSlug {
  const rel = r.sports;
  return (Array.isArray(rel) ? rel[0]?.slug : rel?.slug) ?? "running";
}

/** Lunes de las semanas que siguen y que pertenecen al mismo mes que la semana dada (por su lunes). */
export function followingWeeksOfMonth(start: string): string[] {
  const month = start.slice(0, 7);
  const out: string[] = [];
  for (let w = addDays(start, 7); w.slice(0, 7) === month; w = addDays(w, 7)) out.push(w);
  return out;
}

/** Una sesión de la semana «tipo»: su lugar (día 0 = lunes) y su contenido. */
export type TemplateRow = {
  plan_id: string | null;
  sport_id: string;
  name: string;
  day: number;
  time: string | null;
  day_order: number;
  week_number: number | null;
  target: string | null;
  structure: unknown;
  notes: string | null;
};

/**
 * La semana tal como está planificada, lista para copiarse. Las originales «movidas» no cuentan;
 * una copia de un movimiento vuelve al día y hora de su original.
 */
export async function loadTemplate(supabase: SupabaseClient, start: string): Promise<TemplateRow[]> {
  const days = weekDays(start);
  const { data, error } = await supabase
    .from("sessions")
    .select(WEEK_COLUMNS)
    .gte("scheduled_date", start)
    .lte("scheduled_date", addDays(start, 6));
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as WeekRow[];

  const byId = new Map(rows.map((r) => [r.id, r]));
  const missing = [...new Set(rows.map((r) => r.moved_from_id).filter((v): v is string => !!v && !byId.has(v)))];
  if (missing.length) {
    const { data: extra } = await supabase.from("sessions").select(WEEK_COLUMNS).in("id", missing);
    for (const r of (extra ?? []) as unknown as WeekRow[]) byId.set(r.id, r);
  }

  const out: TemplateRow[] = [];
  for (const r of rows) {
    if (r.status === "movida") continue;
    const place = r.moved_from_id ? (byId.get(r.moved_from_id) ?? r) : r;
    const day = days.indexOf(place.scheduled_date);
    if (day === -1) continue;
    out.push({
      plan_id: r.plan_id,
      sport_id: r.sport_id,
      name: r.name,
      day,
      time: place.scheduled_time,
      day_order: r.day_order ?? 0,
      week_number: r.week_number,
      target: r.target,
      structure: r.structure,
      notes: r.notes,
    });
  }
  return out.sort((a, b) => a.day - b.day || (a.time ?? "99").localeCompare(b.time ?? "99") || a.day_order - b.day_order);
}

export type WriteResult =
  | { ok: true; created: number; replaced: number }
  | { ok: false; skipped: boolean; reason: string };

/**
 * Deja la semana `target` igual a la plantilla.
 * - "replace": reemplaza las rutinas pendientes; si la semana ya tiene sesiones hechas, omitidas o
 *   movidas no la toca (esos datos no se pierden) y avisa.
 * - "create": solo si la semana está vacía.
 * Primero inserta lo nuevo y después borra lo viejo; si algo falla, deshace lo insertado.
 */
export async function writeWeek(
  supabase: SupabaseClient,
  target: string,
  template: TemplateRow[],
  weekOffset: number,
  mode: "replace" | "create",
): Promise<WriteResult> {
  const { data: existing, error: readError } = await supabase
    .from("sessions")
    .select("id, status")
    .gte("scheduled_date", target)
    .lte("scheduled_date", addDays(target, 6));
  if (readError) return { ok: false, skipped: false, reason: "No se pudo leer la semana." };

  const old = existing ?? [];
  if (mode === "create" && old.length) return { ok: true, created: 0, replaced: 0 };
  if (old.some((s) => s.status !== "pendiente")) {
    return { ok: false, skipped: true, reason: "ya tiene sesiones hechas, omitidas o movidas" };
  }

  const rows = template.map((t) => ({
    plan_id: t.plan_id,
    sport_id: t.sport_id,
    name: t.name,
    scheduled_date: addDays(target, t.day),
    scheduled_time: t.time,
    day_order: t.day_order,
    week_number: t.week_number === null ? null : t.week_number + weekOffset,
    status: "pendiente",
    target: t.target,
    structure: t.structure,
    notes: t.notes,
  }));

  let inserted: { id: string }[] = [];
  if (rows.length) {
    const { data, error } = await supabase.from("sessions").insert(rows).select("id");
    if (error || !data) return { ok: false, skipped: false, reason: "No se pudo guardar la semana." };
    inserted = data;
  }

  if (old.length) {
    const { error } = await supabase.from("sessions").delete().in("id", old.map((s) => s.id));
    if (error) {
      if (inserted.length) await supabase.from("sessions").delete().in("id", inserted.map((s) => s.id));
      return { ok: false, skipped: false, reason: "No se pudo reemplazar la semana." };
    }
  }
  return { ok: true, created: inserted.length, replaced: old.length };
}

export type EditedFields =
  | { ok: true; name: string; time: string | null; notes: string | null; structure: unknown; target: string | null }
  | { ok: false; error: string };

/** Valida una edición y arma los campos nuevos de la sesión (mismo criterio que «Editar sesión»). */
export function editedFields(
  sport: SportSlug,
  current: { structure: unknown; target: string | null },
  payload: EditPayload,
): EditedFields {
  const built = buildStructure(sport, (current.structure ?? {}) as J, payload);
  if (!built.ok) return { ok: false, error: built.error };
  const card = describeSession(sport, built.structure, null).card;
  const target = [card.lead, card.side].filter(Boolean).join(" · ") || current.target;
  return {
    ok: true,
    name: built.name,
    time: built.time || null,
    notes: built.notes || null,
    structure: built.structure,
    target,
  };
}
