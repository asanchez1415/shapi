"use client";

import { STATUS_META, StatusIcon } from "./icons";
import { useSessionActions, type ActionTarget } from "./SessionActions";

// Botón redondo de estado de la tarjeta: abre la hoja de acciones.
export function StatusButton({ target, size }: { target: ActionTarget; size: number }) {
  const { open } = useSessionActions();
  const label = STATUS_META[target.status].label;
  return (
    <button
      type="button"
      className="sh-card-status"
      onClick={() => open(target)}
      disabled={target.status === "movida"}
      aria-label={`Estado: ${label}. Cambiar estado`}
    >
      <span className="sh-card-status-ground">
        <StatusIcon status={target.status} size={size} decorative />
      </span>
    </button>
  );
}
