import Link from "next/link";
import { formatMinutes } from "@/lib/describe";
import { formatShort, weekStart } from "@/lib/dates";
import type { SessionDetail } from "@/lib/sessions";
import { NavIcon, STATUS_META, StatusIcon } from "./icons";
import { DetailActions } from "./DetailActions";
import { SportTag } from "./SportTag";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="sh-stat">
      <span className="sh-stat-label">{label}</span>
      <span className="sh-stat-value sh-num">{value}</span>
    </div>
  );
}

// Detalle de una sesión: todo lo que la tarjeta de la semana no muestra.
export function SessionDetailView({ session }: { session: SessionDetail }) {
  const { description: d } = session;
  const stats: [string, string][] = [];
  if (d.count) stats.push([d.count.label.replace(/^\d+ /, "").replace(/^./, (c) => c.toUpperCase()), String(d.count.value)]);
  if (d.minutes !== null) stats.push(["Duración", formatMinutes(d.minutes, d.estimated)]);

  const meta = [formatShort(session.date), session.time].filter(Boolean).join(" · ");
  const backHref = `/semana?w=${weekStart(session.date)}`;
  const moved = session.status === "movida";

  return (
    <article className="detail">
      <Link href={backHref} className="detail-back">
        <NavIcon name="back" size={20} />
        Semana
      </Link>

      <div className="stack" style={{ gap: "var(--espacio-2)", marginTop: "var(--espacio-4)" }}>
        <div className="sh-row" style={{ justifyContent: "space-between" }}>
          <SportTag sport={session.sport} />
          <span className="sh-chip">
            <StatusIcon status={session.status} size={16} decorative />
            <span>{STATUS_META[session.status].label}</span>
          </span>
        </div>
        <h1 className="hd-title">{session.name}</h1>
        <div className="meta sh-num">{meta}</div>
        {session.movedFrom && !moved && <div className="meta">Movida desde el {session.movedFrom}.</div>}
        {moved && session.movedTo && <div className="meta">Se movió al {session.movedTo}.</div>}
      </div>

      <DetailActions
        target={{ id: session.id, name: session.name, status: session.status, date: session.date }}
      />

      {stats.length > 0 && (
        <div className={`kpis${stats.length === 2 ? " k2" : ""}`}>
          {stats.map(([label, value]) => (
            <Stat key={label} label={label} value={value} />
          ))}
        </div>
      )}

      {d.sections.map((section) => (
        <section key={section.title} className="sec">
          <div className="sec-h">
            <h2>{section.title}</h2>
          </div>
          {section.rows.map((row, i) =>
            section.kind === "exercises" ? (
              <div key={i} className="sh-ex">
                <div>
                  <div className="sh-ex-name">{row.label}</div>
                  {row.value && <div className="sh-ex-plan sh-num">{row.value}</div>}
                  {row.note && <div className="sh-ex-plan">{row.note}</div>}
                </div>
              </div>
            ) : (
              <div key={i} className="blk">
                <span className="blk-main">
                  <span>{row.label}</span>
                  {row.note && <span className="blk-note">{row.note}</span>}
                </span>
                {row.value && <span>{row.value}</span>}
              </div>
            ),
          )}
        </section>
      ))}

      {session.notes && (
        <section className="sec">
          <div className="sec-h">
            <h2>Notas</h2>
          </div>
          <p className="detail-notes">{session.notes}</p>
        </section>
      )}
    </article>
  );
}
