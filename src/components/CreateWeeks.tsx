"use client";

import { useState, useTransition } from "react";
import { createWeeks } from "@/app/(app)/actions";
import { useSessionActions } from "./SessionActions";

/** Semana sin rutinas: crea esta semana y las siguientes del mes copiando la anterior. */
export function CreateWeeks({ start, canCopy, count }: { start: string; canCopy: boolean; count: number }) {
  const { notify } = useSessionActions();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function create() {
    setError(null);
    startTransition(async () => {
      const res = await createWeeks(start);
      if (!res.ok) return setError(res.error);
      const made = res.weeks.filter((w) => !w.skipped).length;
      notify(`${made} ${made === 1 ? "semana creada" : "semanas creadas"}. Edítalas para ajustar la progresión.`);
    });
  }

  return (
    <div className="sh-empty">
      <p>Esta semana no tiene rutinas.</p>
      {canCopy ? (
        <>
          <button type="button" className="sh-btn sh-btn-primary" onClick={create} disabled={pending}>
            {pending ? "Creando…" : count > 1 ? `Crear ${count} semanas del mes` : "Crear semana"}
          </button>
          <p className="sh-hint">
            {count > 1
              ? "Copia la semana anterior a esta y a las siguientes del mes. Después las ajustas con «Editar»."
              : "Copia la semana anterior. Después la ajustas con «Editar»."}
          </p>
        </>
      ) : (
        <p className="sh-hint">La semana anterior tampoco tiene rutinas para copiar.</p>
      )}
      {error && <p className="sh-hint sh-hint-warn" role="alert">{error}</p>}
    </div>
  );
}
