import { WeekView } from "@/components/WeekView";
import { isISODate, todayISO, weekStart } from "@/lib/dates";
import { getWeekSessions } from "@/lib/sessions";
import { createClient } from "@/lib/supabase/server";

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

  return <WeekView start={start} today={today} sessions={sessions} />;
}
