"use client";

import { useSessionActions, type ActionTarget } from "./SessionActions";

// Acciones del detalle: cambiar estado. Las rutinas se editan desde «Editar semana».
export function DetailActions({ target }: { target: ActionTarget }) {
  const { open } = useSessionActions();
  if (target.status === "movida") return null;
  return (
    <div className="detail-actions">
      <button type="button" className="sh-btn sh-btn-secondary" onClick={() => open(target)}>
        Cambiar estado
      </button>
    </div>
  );
}
