"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useTransition } from "react";
import { setStatus } from "@/app/(app)/actions";
import { canMarkDone, doneReason } from "@/lib/rules";
import type { Status } from "@/lib/types";
import { StatusIcon } from "./icons";
import { Sheet } from "./Sheet";

export type ActionTarget = { id: string; name: string; status: Status; date: string };

type Ctx = {
  open: (t: ActionTarget) => void;
  /** Muestra un aviso de 4 s; con `undo`, ofrece «Deshacer». */
  notify: (text: string, undo?: () => void) => void;
};
const Ctx = createContext<Ctx | null>(null);

export function useSessionActions() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSessionActions debe usarse dentro de ActionsProvider");
  return ctx;
}

type Toast = { text: string; undo?: () => void };

const MESSAGES: Record<Status, string> = {
  hecha: "hecha.",
  dificultad: "hecha con dificultad.",
  omitida: "no se hizo.",
  pendiente: "pendiente.",
  movida: "movida.",
};

// Hoja de acciones y aviso con "Deshacer" para cambiar el estado de cualquier sesión.
export function ActionsProvider({ today, children }: { today: string; children: React.ReactNode }) {
  const [target, setTarget] = useState<ActionTarget | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [, startTransition] = useTransition();

  const open = useCallback((t: ActionTarget) => setTarget(t), []);
  const close = useCallback(() => setTarget(null), []);
  const notify = useCallback((text: string, undo?: () => void) => setToast({ text, undo }), []);
  const value = useMemo(() => ({ open, notify }), [open, notify]);

  // El aviso dura 4 segundos.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  function change(t: ActionTarget, status: Status, isUndo = false) {
    setTarget(null);
    startTransition(async () => {
      const res = await setStatus(t.id, status);
      if (!res.ok) return setToast({ text: res.error });
      setToast({
        text: `${t.name}: ${MESSAGES[status]}`,
        undo: isUndo
          ? undefined
          : () =>
              startTransition(async () => {
                const res = await setStatus(t.id, t.status);
                if (!res.ok) setToast({ text: res.error });
              }),
      });
    });
  }

  const reason = target ? doneReason(target.date, today) : null;
  const blocked = target ? !canMarkDone(target.date, today) : false;

  function item(status: Status, label: string, disabledReason?: string | null) {
    if (!target || target.status === status) return null;
    return (
      <button
        type="button"
        className="sh-action"
        disabled={!!disabledReason}
        onClick={() => change(target, status)}
      >
        <StatusIcon status={status} size={24} decorative />
        <span className="sh-action-text">
          {label}
          {disabledReason && <span className="sh-action-reason">{disabledReason}</span>}
        </span>
      </button>
    );
  }

  return (
    <Ctx.Provider value={value}>
      {children}

      <Sheet open={!!target} title={target?.name} onClose={close}>
        <div className="sh-actions">
          {item("hecha", "Hecha", blocked ? reason : null)}
          {item("dificultad", "Hecha con dificultad", blocked ? reason : null)}
          {item("omitida", "No se hizo")}
          {item("pendiente", "Volver a pendiente")}
        </div>
      </Sheet>

      {toast && (
        <div className="toast-slot">
          <div className="sh-toast" role="status">
            <span>{toast.text}</span>
            {toast.undo && (
              <button
                type="button"
                className="sh-toast-action"
                onClick={() => {
                  const undo = toast.undo!;
                  setToast(null);
                  undo();
                }}
              >
                Deshacer
              </button>
            )}
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
