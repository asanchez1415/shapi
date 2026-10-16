import Link from "next/link";
import { addDays, formatWeekRange, weekDays } from "@/lib/dates";
import type { SessionItem } from "@/lib/types";
import { AdherenceBar } from "./AdherenceBar";
import { DayHeader } from "./DayHeader";
import { NavIcon } from "./icons";
import { SessionCard } from "./SessionCard";
import { WeekGrid } from "./WeekGrid";

function Card({ s, compact }: { s: SessionItem; compact?: boolean }) {
  return (
    <SessionCard
      id={s.id}
      date={s.date}
      compact={compact}
      status={s.status}
      sport={s.sport}
      name={s.name}
      time={s.time}
      card={s.card}
      href={`/sesion/${s.id}`}
      movedTo={s.movedTo}
      movedFrom={s.movedFrom}
    />
  );
}

type Props = {
  start: string; // lunes de la semana mostrada
  today: string;
  sessions: SessionItem[];
};

// Semana: celular en lista por día; notebook en siete columnas.
export function WeekView({ start, today, sessions }: Props) {
  const days = weekDays(start);
  const byDay = (d: string) => sessions.filter((s) => s.date === d);
  const isCurrent = days.includes(today);

  return (
    <>
      <div className="hd">
        <div>
          <h1 className="hd-title">Semana</h1>
          <div className="hd-sub sh-num">{formatWeekRange(start)}</div>
        </div>
        <div className="hd-actions">
          <Link className="ib ib-border" href={`/semana?w=${addDays(start, -7)}`} aria-label="Semana anterior" title="Semana anterior">
            <NavIcon name="back" size={20} />
          </Link>
          {!isCurrent && (
            <Link className="ib ib-border ib-text" href="/semana">
              Hoy
            </Link>
          )}
          <Link className="ib ib-border" href={`/semana?w=${addDays(start, 7)}`} aria-label="Semana siguiente" title="Semana siguiente">
            <NavIcon name="next" size={20} />
          </Link>
        </div>
      </div>

      <div className="wk-adh">
        <AdherenceBar sessions={sessions.map((s) => s.status)} />
      </div>

      {/* Celular */}
      <div className="wk-list">
        {days.map((d) => (
          <section key={d} className="sec">
            <DayHeader date={d} today={d === today} />
            {byDay(d).length ? (
              <div className="stack" style={{ marginTop: "var(--espacio-3)" }}>
                {byDay(d).map((s) => (
                  <Card key={s.id} s={s} />
                ))}
              </div>
            ) : (
              <div className="sh-rest">Descanso</div>
            )}
          </section>
        ))}
      </div>

      {/* Notebook: calendario por horas */}
      <WeekGrid days={days} today={today} sessions={sessions} />
    </>
  );
}
