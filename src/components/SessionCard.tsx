import Link from "next/link";
import type { CardLines } from "@/lib/describe";
import type { SportSlug, Status } from "@/lib/types";
import { NavIcon } from "./icons";
import { SportTag } from "./SportTag";
import { StatusButton } from "./StatusButton";

type Props = {
  id: string;
  /** Fecha de la sesión (AAAA-MM-DD): decide si se puede marcar como hecha. */
  date: string;
  status: Status;
  sport: SportSlug;
  name: string;
  time?: string | null;
  /** Filas bajo el nombre: principal, tiempo y frecuencia cardíaca o ritmo. */
  card: CardLines;
  /** Si se da, el nombre enlaza al detalle y toda la tarjeta es clicable. */
  href?: string;
  movedTo?: string | null;
  movedFrom?: string | null;
  compact?: boolean;
};

// Tarjeta de sesión del sistema de diseño.
export function SessionCard({
  id,
  date,
  status,
  sport,
  name,
  time,
  card,
  href,
  movedTo,
  movedFrom,
  compact,
}: Props) {
  const moved = status === "movida";
  const cls = ["sh-card", compact && "sh-card-compact", moved && "sh-card-moved"]
    .filter(Boolean)
    .join(" ");

  const title = href ? (
    <Link href={href} className="sh-card-open">
      {name}
    </Link>
  ) : (
    name
  );

  const statusButton = (size: number) => (
    <StatusButton target={{ id, name, status, date }} size={size} />
  );

  const details = (
    <div className="sh-card-rows">
      {card.lead && (
        <div className="sh-card-target sh-card-iconed sh-num">
          {card.leadKind && <NavIcon name={card.leadKind} size={16} />}
          {card.lead}
        </div>
      )}
      {card.duration && (
        <div className="sh-card-dur sh-card-iconed sh-num">
          <NavIcon name="time" size={16} />
          {card.duration}
        </div>
      )}
      {card.side && (
        <div className="sh-card-side sh-card-iconed sh-num">
          {card.sideKind && <NavIcon name={card.sideKind === "hr" ? "heart" : "pace"} size={16} />}
          {card.side}
        </div>
      )}
    </div>
  );

  if (compact) {
    return (
      <article className={cls}>
        <div className="sh-card-top">
          {statusButton(20)}
          {time && <span className="sh-card-time sh-num">{time}</span>}
        </div>
        <SportTag sport={sport} />
        <h3 className="sh-card-name">{title}</h3>
        {details}
        {moved && movedTo && <div className="sh-card-note">A {movedTo}</div>}
        {!moved && movedFrom && <div className="sh-card-note">Desde {movedFrom}</div>}
      </article>
    );
  }

  return (
    <article className={cls}>
      {statusButton(24)}
      <div className="sh-card-body">
        <div className="sh-card-top">
          <SportTag sport={sport} />
          {time && <span className="sh-card-time sh-num">{time}</span>}
        </div>
        <h3 className="sh-card-name">{title}</h3>
        {details}
        {moved && movedTo && <div className="sh-card-note">Movida a {movedTo}</div>}
        {!moved && movedFrom && <div className="sh-card-note">Movida desde {movedFrom}</div>}
      </div>
    </article>
  );
}
