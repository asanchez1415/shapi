import { dayNumber, monthShort, weekdayName } from "@/lib/dates";

export function DayHeader({ date, today }: { date: string; today?: boolean }) {
  return (
    <div className="sh-day">
      <span className="sh-day-name">{weekdayName(date)}</span>
      <span className="sh-day-date sh-num">
        {dayNumber(date)} {monthShort(date)}
      </span>
      {today && <span className="sh-day-today">Hoy</span>}
    </div>
  );
}
