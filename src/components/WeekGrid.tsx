"use client";

import { useRef, useState, useTransition, type DragEvent } from "react";
import { moveSession, undoMove } from "@/app/(app)/actions";
import { formatShort } from "@/lib/dates";
import { moveBlockedReason } from "@/lib/rules";
import type { SessionItem } from "@/lib/types";
import { DayHeader } from "./DayHeader";
import { SessionCard } from "./SessionCard";
import { useSessionActions } from "./SessionActions";

// Calendario de la semana por horas (notebook): horas a la izquierda, una columna por día.
// Las sesiones sin hora van arriba, en «Sin hora». Arrastrar una tarjeta la lleva a otro día u hora.

const HOUR_PX = 80;
const SNAP_MIN = 15;
const MIN_SHOWN_MIN = 35; // alto mínimo de una tarjeta, para que siempre se lea
const DEFAULT_MIN = 60; // si la sesión no tiene duración calculable

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

type Placed = { s: SessionItem; start: number; end: number; lane: number; lanes: number };

/** Reparte en carriles las tarjetas que se pisan en el mismo día. */
function place(items: SessionItem[]): Placed[] {
  const rows = items
    .map((s) => {
      const start = toMin(s.time!);
      return { s, start, end: start + Math.max(s.minutes ?? DEFAULT_MIN, MIN_SHOWN_MIN), lane: 0, lanes: 1 };
    })
    .sort((a, b) => a.start - b.start || a.end - b.end);

  let cluster: Placed[] = [];
  let clusterEnd = -1;
  const close = () => {
    const laneEnds: number[] = [];
    for (const r of cluster) {
      let lane = laneEnds.findIndex((e) => e <= r.start);
      if (lane === -1) lane = laneEnds.length;
      laneEnds[lane] = r.end;
      r.lane = lane;
    }
    cluster.forEach((r) => (r.lanes = laneEnds.length));
    cluster = [];
  };
  for (const r of rows) {
    if (cluster.length && r.start >= clusterEnd) close();
    cluster.push(r);
    clusterEnd = Math.max(clusterEnd, r.end);
  }
  if (cluster.length) close();
  return rows;
}

type Drag = { id: string; item: SessionItem; grabY: number };
type Hover = { date: string; zone: "strip" | "body"; min?: number };

export function WeekGrid({ days, today, sessions }: { days: string[]; today: string; sessions: SessionItem[] }) {
  const { notify } = useSessionActions();
  const [pending, startTransition] = useTransition();
  const [drag, setDrag] = useState<Drag | null>(null);
  const [hover, setHover] = useState<Hover | null>(null);
  const dragRef = useRef<Drag | null>(null);

  const timed = sessions.filter((s) => s.time);
  const startHour = Math.max(0, Math.min(6, ...timed.map((s) => Math.floor(toMin(s.time!) / 60))));
  const endHour = Math.min(
    24,
    Math.max(22, ...timed.map((s) => Math.ceil((toMin(s.time!) + Math.max(s.minutes ?? DEFAULT_MIN, MIN_SHOWN_MIN)) / 60))),
  );
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const bodyHeight = (endHour - startHour) * HOUR_PX;

  const movable = (s: SessionItem) => s.status === "pendiente";

  // ¿Puede la sesión que se arrastra caer en este día? Mismo día = solo cambia la hora.
  function allowed(d: Drag | null, date: string): boolean {
    if (!d) return false;
    if (d.item.date === date) return true;
    return !moveBlockedReason({ fromDate: d.item.date, toDate: date, today, isCopy: !!d.item.movedFrom });
  }

  function onDragStart(e: DragEvent, item: SessionItem) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const next = { id: item.id, item, grabY: Math.min(e.clientY - rect.top, 24) };
    dragRef.current = next;
    setDrag(next);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", item.id);
  }

  function end() {
    dragRef.current = null;
    setDrag(null);
    setHover(null);
  }

  function minuteAt(e: DragEvent, body: HTMLElement): number {
    const y = e.clientY - body.getBoundingClientRect().top - (dragRef.current?.grabY ?? 0);
    const raw = startHour * 60 + (y / HOUR_PX) * 60;
    const snapped = Math.round(raw / SNAP_MIN) * SNAP_MIN;
    return Math.min(Math.max(snapped, startHour * 60), endHour * 60 - SNAP_MIN);
  }

  function over(e: DragEvent, date: string, zone: Hover["zone"]) {
    if (!allowed(dragRef.current, date)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const min = zone === "body" ? minuteAt(e, e.currentTarget as HTMLElement) : undefined;
    setHover((h) => (h && h.date === date && h.zone === zone && h.min === min ? h : { date, zone, min }));
  }

  function drop(e: DragEvent, date: string, zone: Hover["zone"]) {
    const d = dragRef.current;
    if (!d || !allowed(d, date)) return;
    e.preventDefault();
    const time = zone === "body" ? toTime(minuteAt(e, e.currentTarget as HTMLElement)) : null;
    end();

    const { item } = d;
    if (item.date === date && item.time === time) return;
    startTransition(async () => {
      const res = await moveSession(item.id, date, time);
      if (!res.ok) return notify(res.error);
      if (res.copyId) {
        const copyId = res.copyId;
        notify(`${item.name}: movida al ${formatShort(date)}.`, () =>
          startTransition(async () => {
            const undone = await undoMove(copyId);
            if (!undone.ok) notify(undone.error);
          }),
        );
      } else {
        notify(time ? `${item.name}: ahora a las ${time}.` : `${item.name}: sin hora.`, () =>
          startTransition(async () => {
            const back = await moveSession(item.id, item.date, item.time);
            if (!back.ok) notify(back.error);
          }),
        );
      }
    });
  }

  function card(s: SessionItem, variant: "compact" | "timed") {
    return (
      <SessionCard
        id={s.id}
        date={s.date}
        compact={variant === "compact"}
        timed={variant === "timed"}
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

  const dragProps = (s: SessionItem) =>
    movable(s)
      ? { draggable: true, onDragStart: (e: DragEvent) => onDragStart(e, s), onDragEnd: end }
      : {};

  return (
    <div className={`wkg${pending ? " wkg-pending" : ""}${drag ? " wkg-dragging" : ""}`}>
      <div className="wkg-row wkg-head">
        <div />
        {days.map((d) => (
          <div key={d} className="wkg-day">
            <DayHeader date={d} today={d === today} />
          </div>
        ))}
      </div>

      <div className="wkg-row wkg-stripRow">
        <div className="wkg-gutter wkg-stripLabel">Sin hora</div>
        {days.map((d) => {
          const all = sessions.filter((s) => s.date === d);
          const loose = all.filter((s) => !s.time);
          const blocked = !!drag && !allowed(drag, d);
          const active = hover?.date === d && hover.zone === "strip";
          return (
            <div
              key={d}
              className={`wkg-strip${blocked ? " wkg-blocked" : ""}${active ? " wkg-over" : ""}`}
              onDragOver={(e) => over(e, d, "strip")}
              onDrop={(e) => drop(e, d, "strip")}
            >
              {loose.map((s) => (
                <div key={s.id} className="wkg-drag" {...dragProps(s)}>
                  {card(s, "compact")}
                </div>
              ))}
              {!all.length && <div className="wk-rest">Descanso</div>}
            </div>
          );
        })}
      </div>

      <div className="wkg-row wkg-bodyRow">
        <div className="wkg-gutter wkg-hours" style={{ height: bodyHeight }}>
          {hours.map((h) => (
            <span key={h} className="wkg-hour sh-num" style={{ top: (h - startHour) * HOUR_PX }}>
              {String(h).padStart(2, "0")}:00
            </span>
          ))}
        </div>
        {days.map((d) => {
          const placed = place(sessions.filter((s) => s.date === d && s.time));
          const blocked = !!drag && !allowed(drag, d);
          const ghost = hover?.date === d && hover.zone === "body" && hover.min !== undefined ? hover.min : null;
          return (
            <div
              key={d}
              className={`wkg-body${blocked ? " wkg-blocked" : ""}`}
              style={{ height: bodyHeight, ["--hour" as string]: `${HOUR_PX}px` }}
              onDragOver={(e) => over(e, d, "body")}
              onDrop={(e) => drop(e, d, "body")}
            >
              {placed.map(({ s, start, lane, lanes }) => {
                const shown = Math.max(s.minutes ?? DEFAULT_MIN, MIN_SHOWN_MIN);
                return (
                  <div
                    key={s.id}
                    className="wkg-drag wkg-item"
                    style={{
                      top: ((start - startHour * 60) * HOUR_PX) / 60,
                      height: (shown * HOUR_PX) / 60 - 2,
                      left: `calc(${(lane / lanes) * 100}% + 1px)`,
                      width: `calc(${100 / lanes}% - 2px)`,
                    }}
                    {...dragProps(s)}
                  >
                    {card(s, "timed")}
                  </div>
                );
              })}
              {ghost !== null && drag && (
                <div
                  className="wkg-ghost sh-num"
                  style={{
                    top: ((ghost - startHour * 60) * HOUR_PX) / 60,
                    height: (Math.max(drag.item.minutes ?? DEFAULT_MIN, MIN_SHOWN_MIN) * HOUR_PX) / 60 - 2,
                  }}
                >
                  {toTime(ghost)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
