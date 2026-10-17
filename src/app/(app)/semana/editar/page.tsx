import Link from "next/link";
import { WeekEditor, type EditorItem, type EditorTarget } from "@/components/WeekEditor";
import { NavIcon } from "@/components/icons";
import { addDays, formatShort, formatWeekRange, isISODate, todayISO, weekDays, weekStart } from "@/lib/dates";
import { editKind, toPayload } from "@/lib/edit";
import { createClient } from "@/lib/supabase/server";
import { WEEK_COLUMNS, followingWeeksOfMonth, sportOfRow, type WeekRow } from "@/lib/weekplan";

export const metadata = { title: "Editar semana · Shapi" };

export default async function EditarSemanaPage({ searchParams }: { searchParams: Promise<{ w?: string }> }) {
  const { w } = await searchParams;
  const start = weekStart(isISODate(w) ? w : todayISO());
  const days = weekDays(start);

  const supabase = await createClient();

  // Rutinas de la semana
  const { data: weekData } = await supabase
    .from("sessions")
    .select(WEEK_COLUMNS)
    .gte("scheduled_date", start)
    .lte("scheduled_date", addDays(start, 6))
    .order("scheduled_date")
    .order("scheduled_time", { nullsFirst: false })
    .order("day_order");
  const rows = (weekData ?? []) as unknown as WeekRow[];

  const items: EditorItem[] = rows
    // La copia de un movimiento se edita; la original «movida» solo se muestra.
    .map((r) => {
      const sport = sportOfRow(r);
      const structure = (r.structure ?? {}) as Record<string, unknown>;
      return {
        key: r.id,
        id: r.id,
        category: null,
        variant: null,
        sport,
        status: r.status,
        day: days.indexOf(r.scheduled_date),
        kind: editKind(sport, structure),
        payload: toPayload(sport, structure, {
          name: r.name,
          time: r.scheduled_time ? r.scheduled_time.slice(0, 5) : null,
          notes: r.notes,
        }),
      } satisfies EditorItem;
    });

  // Semanas siguientes del mes y si alguna no se puede reemplazar
  const following = followingWeeksOfMonth(start);
  const targets: EditorTarget[] = [];
  if (following.length) {
    const { data: locked } = await supabase
      .from("sessions")
      .select("scheduled_date")
      .neq("status", "pendiente")
      .gte("scheduled_date", following[0])
      .lte("scheduled_date", addDays(following[following.length - 1], 6));
    const lockedWeeks = new Set((locked ?? []).map((s) => weekStart(s.scheduled_date as string)));
    for (const f of following) {
      targets.push({
        start: f,
        label: `${formatShort(f).replace(/^\S+ /, "")} – ${formatShort(addDays(f, 6)).replace(/^\S+ /, "")}`,
        blocked: lockedWeeks.has(f),
      });
    }
  }

  return (
    <div className="detail wedit">
      <Link href={`/semana?w=${start}`} className="detail-back">
        <NavIcon name="back" size={20} />
        Semana
      </Link>
      <div className="stack" style={{ gap: "var(--espacio-2)", marginTop: "var(--espacio-4)" }}>
        <h1 className="hd-title">Editar semana</h1>
        <p className="meta sh-num">{formatWeekRange(start)}</p>
      </div>
      <WeekEditor start={start} items={items} targets={targets} />
    </div>
  );
}
