import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, formatShort } from "./dates";
import { describeSession, type Described } from "./describe";
import type { SessionItem, SportSlug, Status } from "./types";

type Row = {
  id: string;
  name: string;
  scheduled_date: string;
  scheduled_time: string | null;
  day_order: number | null;
  status: Status;
  target: string | null;
  structure: unknown;
  notes: string | null;
  moved_from_id: string | null;
  sports: { slug: SportSlug } | { slug: SportSlug }[] | null;
};

const COLUMNS =
  "id, name, scheduled_date, scheduled_time, day_order, status, target, structure, notes, moved_from_id, sports(slug)";

/** Sesiones planificadas de una semana (lunes a domingo), ordenadas por día y hora. */
export async function getWeekSessions(
  supabase: SupabaseClient,
  start: string,
): Promise<SessionItem[]> {
  const { data, error } = await supabase
    .from("sessions")
    .select(COLUMNS)
    .gte("scheduled_date", start)
    .lte("scheduled_date", addDays(start, 6))
    .order("scheduled_date")
    .order("scheduled_time", { nullsFirst: false })
    .order("day_order");
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as Row[];
  const ids = rows.map((r) => r.id);

  // Vínculos entre la sesión original y su copia, aunque una quede fuera de la semana.
  const movedFromIds = [...new Set(rows.map((r) => r.moved_from_id).filter((v): v is string => !!v))];
  const [originals, copies] = await Promise.all([
    movedFromIds.length
      ? supabase.from("sessions").select("id, scheduled_date").in("id", movedFromIds)
      : Promise.resolve({ data: [] as { id: string; scheduled_date: string }[] }),
    ids.length
      ? supabase.from("sessions").select("moved_from_id, scheduled_date").in("moved_from_id", ids)
      : Promise.resolve({ data: [] as { moved_from_id: string; scheduled_date: string }[] }),
  ]);

  const originalDate = new Map((originals.data ?? []).map((o) => [o.id, o.scheduled_date]));
  const copyDate = new Map((copies.data ?? []).map((c) => [c.moved_from_id, c.scheduled_date]));

  return rows.map((r) =>
    toItem(r, originalDate.get(r.moved_from_id ?? ""), copyDate.get(r.id)),
  );
}

function sportOf(r: Row): SportSlug {
  const sport = Array.isArray(r.sports) ? r.sports[0]?.slug : r.sports?.slug;
  return sport ?? "running";
}

function toItem(r: Row, from?: string, to?: string): SessionItem {
  const sport = sportOf(r);
  return {
    id: r.id,
    name: r.name,
    date: r.scheduled_date,
    time: r.scheduled_time ? r.scheduled_time.slice(0, 5) : null,
    status: r.status,
    sport,
    card: describeSession(sport, r.structure, r.target).card,
    movedTo: to ? formatShort(to) : null,
    movedFrom: from ? formatShort(from) : null,
  };
}

export type SessionDetail = SessionItem & {
  structure: unknown;
  description: Described;
  notes: string | null;
};

/** Una sesión con todo su detalle; null si no existe o no es de la persona. */
export async function getSessionDetail(
  supabase: SupabaseClient,
  id: string,
): Promise<SessionDetail | null> {
  const { data, error } = await supabase.from("sessions").select(COLUMNS).eq("id", id).maybeSingle();
  if (error || !data) return null;
  const r = data as unknown as Row;

  const [original, copy] = await Promise.all([
    r.moved_from_id
      ? supabase.from("sessions").select("scheduled_date").eq("id", r.moved_from_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("sessions").select("scheduled_date").eq("moved_from_id", r.id).maybeSingle(),
  ]);

  return {
    ...toItem(
      r,
      (original.data as { scheduled_date: string } | null)?.scheduled_date,
      (copy.data as { scheduled_date: string } | null)?.scheduled_date,
    ),
    structure: r.structure,
    description: describeSession(sportOf(r), r.structure, r.target),
    notes: r.notes,
  };
}

/** Las próximas sesiones pendientes después de hoy. */
export async function getUpcoming(
  supabase: SupabaseClient,
  today: string,
  limit = 4,
): Promise<SessionItem[]> {
  const { data, error } = await supabase
    .from("sessions")
    .select(COLUMNS)
    .gt("scheduled_date", today)
    .eq("status", "pendiente")
    .order("scheduled_date")
    .order("scheduled_time", { nullsFirst: false })
    .order("day_order")
    .limit(limit);
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as Row[]).map((r) => toItem(r));
}
