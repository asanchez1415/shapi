"use client";

import { useRef, useState, useTransition, type DragEvent } from "react";
import { moveSession, undoMove } from "@/app/(app)/actions";
import { formatShort } from "@/lib/dates";
import { moveBlockedReason } from "@/lib/rules";
import type { SessionItem } from "@/lib/types";
import { DayHeader } from "./DayHeader";
import { SessionCard } from "./SessionCard";
import { useSessionActions } from "./SessionActions";

// Semana en notebook: una columna por día. Arrastrar una tarjeta a otro día la mueve
// (duplica la sesión y deja la original como «movida»), con la misma hora.
export function WeekColumns({ days, today, sessions }: { days: string[]; today: string; sessions: SessionItem[] }) {
  const { notify } = useSessionActions();
  const [pending, startTransition] = useTransition();
  const [drag, setDrag] = useState<SessionItem | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const dragRef = useRef<SessionItem | null>(null);

  // Solo una sesión pendiente que cae en otro día de la semana actual que no haya pasado.
  function allowed(item: SessionItem | null, date: string): boolean {
    if (!item || item.date === date) return false;
    return !moveBlockedReason({ fromDate: item.date, toDate: date, today, isCopy: !!item.movedFrom });
  }

  function end() {
    dragRef.current = null;
    setDrag(null);
    setOver(null);
  }

  function onDrop(e: DragEvent, date: string) {
    const item = dragRef.current;
    if (!item || !allowed(item, date)) return;
    e.preventDefault();
    end();
    startTransition(async () => {
      const res = await moveSession(item.id, date, item.time);
      if (!res.ok) return notify(res.error);
      const copyId = res.copyId;
      notify(
        `${item.name}: movida al ${formatShort(date)}.`,
        copyId
          ? () =>
              startTransition(async () => {
                const undone = await undoMove(copyId);
                if (!undone.ok) notify(undone.error);
              })
          : undefined,
      );
    });
  }

  return (
    <div className={`wk${pending ? " wk-pending" : ""}`}>
      {days.map((d) => {
        const list = sessions.filter((s) => s.date === d);
        const blocked = !!drag && drag.date !== d && !allowed(drag, d);
        return (
          <div
            key={d}
            className={`wk-col${blocked ? " wk-col-blocked" : ""}${over === d ? " wk-col-over" : ""}`}
            onDragOver={(e) => {
              if (!allowed(dragRef.current, d)) return setOver((o) => (o === d ? null : o));
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setOver(d); // al pasar a otra columna, esa toma el resaltado
            }}
            onDrop={(e) => onDrop(e, d)}
          >
            <DayHeader date={d} today={d === today} />
            {list.length ? (
              list.map((s) => (
                <div
                  key={s.id}
                  className="wk-drag"
                  {...(s.status === "pendiente"
                    ? {
                        draggable: true,
                        onDragStart: (e: DragEvent) => {
                          dragRef.current = s;
                          setDrag(s);
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData("text/plain", s.id);
                        },
                        onDragEnd: end,
                      }
                    : {})}
                >
                  <SessionCard
                    id={s.id}
                    date={s.date}
                    compact
                    status={s.status}
                    sport={s.sport}
                    name={s.name}
                    time={s.time}
                    card={s.card}
                    href={`/sesion/${s.id}`}
                    movedTo={s.movedTo}
                    movedFrom={s.movedFrom}
                  />
                </div>
              ))
            ) : (
              <div className="wk-rest">Descanso</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
