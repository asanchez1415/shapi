import { WeekView } from "@/components/WeekView";
import { addDays, isISODate, todayISO, weekStart } from "@/lib/dates";
import { getWeekSessions } from "@/lib/sessions";
import { createClient } from "@/lib/supabase/server";
import { followingWeeksOfMonth } from "@/lib/weekplan";

export const metadata = { title: "Semana · Shapi" };

export default async function SemanaPage({
  searchParams,
}: {
  searchParams: Promise<{ w?: string }>;
}) {
  const { w } = await searchParams;
  const today = todayISO();
  const start = weekStart(isISODate(w) ? w : today);

  const supabase = await createClient();
  const sessions = await getWeekSessions(supabase, start);

  // Semana vacía: ¿hay una anterior que copiar?
  let create: { canCopy: boolean; count: number } | undefined;
  if (!sessions.length) {
    const { count } = await supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .gte("scheduled_date", addDays(start, -7))
      .lte("scheduled_date", addDays(start, -1));
    create = { canCopy: (count ?? 0) > 0, count: 1 + followingWeeksOfMonth(start).length };
  }

  return <WeekView start={start} today={today} sessions={sessions} create={create} />;
}
