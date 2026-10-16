import Link from "next/link";
import { addDays, dayNumber, formatShort, monthShort, weekdayName } from "@/lib/dates";
import type { SessionItem } from "@/lib/types";
import { AdherenceBar } from "./AdherenceBar";
import { SessionCard } from "./SessionCard";
import { SportTag } from "./SportTag";

function Card({ s }: { s: SessionItem }) {
  return (
    <SessionCard
      id={s.id}
      date={s.date}
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
  today: string;
  /** Sesiones de la semana en curso. */
  week: SessionItem[];
  upcoming: SessionItem[];
};

// Hoy: lo que toca entrenar ahora, cómo va la semana y lo que viene.
export function TodayView({ today, week, upcoming }: Props) {
  const todays = week.filter((s) => s.date === today);
  const weekday = weekdayName(today);
  const subtitle = `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${dayNumber(today)} ${monthShort(today)}`;
  const adherence = <AdherenceBar sessions={week.map((s) => s.status)} />;
  const tomorrow = addDays(today, 1);

  return (
    <>
      <div className="hd">
        <div>
          <h1 className="hd-title">Hoy</h1>
          <div className="hd-sub sh-num">{subtitle}</div>
        </div>
      </div>

      <div className="today-cols">
        <div>
          <div className="today-adh-mobile">{adherence}</div>

          <section className="sec">
            <div className="sec-h">
              <h2>Sesiones de hoy</h2>
              <span className="meta">
                {todays.length} {todays.length === 1 ? "planificada" : "planificadas"}
              </span>
            </div>
            {todays.length ? (
              <div className="stack">
                {todays.map((s) => (
                  <Card key={s.id} s={s} />
                ))}
              </div>
            ) : (
              <div className="sh-rest">Descanso</div>
            )}
          </section>
        </div>

        <aside className="today-side">
          <div className="today-adh-desktop">{adherence}</div>

          <section className="sec">
            <div className="sec-h">
              <h2>Próximas</h2>
            </div>
            {upcoming.length ? (
              <div className="up-list">
                {upcoming.map((s) => (
                  <Link key={s.id} href={`/sesion/${s.id}`} className="up-row">
                    <span className="up-main">
                      <SportTag sport={s.sport} />
                      <span className="up-name">{s.name}</span>
                    </span>
                    <span className="up-date sh-num">{s.date === tomorrow ? "Mañana" : formatShort(s.date)}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="sh-rest">No hay sesiones pendientes.</div>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
