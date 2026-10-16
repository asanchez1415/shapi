import type { Status } from "@/lib/types";
import { STATUS_META } from "./icons";

const SEG: Record<Status, string> = {
  hecha: "var(--estado-hecha)",
  dificultad: "var(--estado-dificultad)",
  omitida: "var(--estado-omitida)",
  movida: "var(--estado-movida)",
  pendiente: "var(--linea)",
};

// Las movidas no cuentan: la sesión nueva ocupa su lugar.
export function AdherenceBar({ sessions, label = "Esta semana" }: { sessions: Status[]; label?: string }) {
  const done = sessions.filter((s) => s === "hecha" || s === "dificultad").length;
  const total = sessions.filter((s) => s !== "movida").length;
  return (
    <div className="sh-adh" role="group" aria-label={`${label}: ${done} de ${total} sesiones hechas`}>
      <div className="sh-adh-head">
        <span>{label}</span>
        <span className="sh-num">
          <strong>{done}</strong> de {total} hechas
        </span>
      </div>
      <div className="sh-adh-bar" aria-hidden>
        {sessions.map((s, i) => (
          <span
            key={i}
            className="sh-adh-seg"
            title={STATUS_META[s].label}
            style={{ background: SEG[s] }}
          />
        ))}
      </div>
    </div>
  );
}
