"use client";

import Link from "next/link";
import { useSessionActions, type ActionTarget } from "./SessionActions";

// Acciones del detalle: cambiar estado y, si sigue pendiente, editar.
export function DetailActions({ target, editHref }: { target: ActionTarget; editHref?: string }) {
  const { open } = useSessionActions();
  if (target.status === "movida") return null;
  return (
    <div className="detail-actions">
      <button type="button" className="sh-btn sh-btn-secondary" onClick={() => open(target)}>
        Cambiar estado
      </button>
      {editHref && (
        <Link href={editHref} className="sh-btn sh-btn-secondary">
          Editar
        </Link>
      )}
    </div>
  );
}
