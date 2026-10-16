import { TodayView } from "@/components/TodayView";
import { todayISO, weekStart } from "@/lib/dates";
import { getUpcoming, getWeekSessions } from "@/lib/sessions";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Hoy · Shapi" };

export default async function HoyPage() {
  const today = todayISO();
  const supabase = await createClient();
  const [week, upcoming] = await Promise.all([
    getWeekSessions(supabase, weekStart(today)),
    getUpcoming(supabase, today, 4),
  ]);

  return <TodayView today={today} week={week} upcoming={upcoming} />;
}
