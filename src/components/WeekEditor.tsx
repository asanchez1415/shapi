"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { saveWeek, type WeekSavePayload } from "@/app/(app)/actions";
import type { EditKind, EditPayload } from "@/lib/edit";
import type { SportSlug } from "@/lib/types";
import { SelectField } from "./Fields";
import { StatusIcon } from "./icons";
import { SessionFields } from "./SessionFields";
import { useSessionActions } from "./SessionActions";
import { SportTag } from "./SportTag";

export type EditorItem = {
  key: string;
  id: string | null;
  templateId: string | null;
  sport: SportSlug;
  status: string;
  day: number;
  kind: EditKind;
  payload: EditPayload;
};
export type EditorTemplate = { id: string; sport: SportSlug; kind: EditKind; payload: EditPayload };
export type EditorTarget = { start: string; label: string; blocked: boolean };

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const DAY_OPTIONS = DAYS.map((d, i) => ({ value: String(i), label: d }));
const STATUS_OK = ["pendiente"];

let counter = 0;
const newKey = () => `n${++counter}`;

export function WeekEditor({
  start,
  items: initial,
  templates,
  targets,
}: {
  start: string;
  items: EditorItem[];
  templates: EditorTemplate[];
  targets: EditorTarget[];
}) {
  const router = useRouter();
  const { notify } = useSessionActions();
  const [items, setItems] = useState<EditorItem[]>(initial);
  const [removed, setRemoved] = useState<string[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [propagate, setPropagate] = useState(targets.length > 0);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const errorRef = useRef<HTMLParagraphElement>(null);

  const patch = (key: string, fn: (it: EditorItem) => EditorItem) =>
    setItems((list) => list.map((it) => (it.key === key ? fn(it) : it)));

  function remove(it: EditorItem) {
    setItems((list) => list.filter((x) => x.key !== it.key));
    if (it.id) setRemoved((r) => [...r, it.id!]);
    if (open === it.key) setOpen(null);
  }

  function add(day: number, templateId: string) {
    const t = templates.find((x) => x.id === templateId);
    if (!t) return;
    const key = newKey();
    setItems((list) => [
      ...list,
      { key, id: null, templateId: t.id, sport: t.sport, status: "pendiente", day, kind: t.kind, payload: structuredClone(t.payload) },
    ]);
    setOpen(key);
  }

  const replaceable = targets.filter((t) => !t.blocked);
  const needsConfirm = propagate && replaceable.length > 0;

  function save() {
    setError(null);
    const payload: WeekSavePayload = {
      sessions: items
        .filter((it) => STATUS_OK.includes(it.status))
        .map((it) => ({ id: it.id, templateId: it.templateId, day: it.day, edit: it.payload })),
      removed,
      propagate,
    };
    startTransition(async () => {
      const res = await saveWeek(start, payload);
      if (!res.ok) {
        setConfirming(false);
        setError(res.error);
        requestAnimationFrame(() => errorRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }));
        return;
      }
      const done = res.weeks.filter((w) => !w.skipped).length;
      const skipped = res.weeks.filter((w) => w.skipped);
      let text = "Semana guardada";
      if (propagate) text += done ? ` y ${done} ${done === 1 ? "semana siguiente actualizada" : "semanas siguientes actualizadas"}` : "";
      if (skipped.length) text += `. Se saltó ${skipped.length === 1 ? "1 semana" : `${skipped.length} semanas`} con sesiones hechas, omitidas o movidas`;
      notify(`${text}.`);
      router.push(`/semana?w=${start}`);
      router.refresh();
    });
  }

  return (
    <div className="wedit-body">
      {DAYS.map((dayName, day) => {
        const list = items
          .filter((it) => it.day === day)
          .sort((a, b) => (a.payload.time || "99").localeCompare(b.payload.time || "99"));
        return (
          <section key={dayName} className="wedit-day">
            <h2 className="edit-h">{dayName}</h2>
            {list.map((it) => {
              const editable = STATUS_OK.includes(it.status);
              const isOpen = open === it.key;
              return (
                <div key={it.key} className={`edit-row wedit-item${editable ? "" : " wedit-locked"}`}>
                  <div className="edit-row-head">
                    <div className="wedit-title">
                      <SportTag sport={it.sport} />
                      <span className="edit-row-title">{it.payload.name || "Sin nombre"}</span>
                      <span className="wedit-time sh-num">{it.payload.time || "Sin hora"}</span>
                    </div>
                    {editable ? (
                      <div className="wedit-actions">
                        <button type="button" className="sh-link" onClick={() => setOpen(isOpen ? null : it.key)}>
                          {isOpen ? "Cerrar" : "Editar"}
                        </button>
                        <button type="button" className="sh-link" onClick={() => remove(it)}>
                          Quitar
                        </button>
                      </div>
                    ) : (
                      <span className="wedit-status">
                        <StatusIcon status={it.status as never} size={18} decorative />
                        {it.status === "movida" ? "Movida" : "Ya registrada"}
                      </span>
                    )}
                  </div>
                  {editable && isOpen && (
                    <div className="stack">
                      <SelectField
                        label="Día"
                        value={String(it.day)}
                        options={DAY_OPTIONS}
                        onChange={(v) => patch(it.key, (x) => ({ ...x, day: Number(v) }))}
                      />
                      <SessionFields kind={it.kind} value={it.payload} onChange={(p) => patch(it.key, (x) => ({ ...x, payload: p }))} />
                    </div>
                  )}
                </div>
              );
            })}
            {templates.length > 0 && (
              <div className="wedit-add">
                <select
                  aria-label={`Agregar rutina el ${dayName.toLowerCase()}`}
                  value=""
                  onChange={(e) => add(day, e.target.value)}
                >
                  <option value="">Agregar rutina…</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.payload.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </section>
        );
      })}

      <section className="wedit-save">
        {targets.length > 0 && (
          <label className="wedit-check">
            <input type="checkbox" checked={propagate} onChange={(e) => { setPropagate(e.target.checked); setConfirming(false); }} />
            <span>
              Aplicar a las semanas siguientes del mes
              <small>
                {targets.map((t) => t.label).join(" · ")}. Quedan con la misma estructura y rutinas que esta semana.
              </small>
            </span>
          </label>
        )}

        {confirming && needsConfirm && (
          <p className="sh-hint sh-hint-warn" role="alert">
            Se reemplazan las rutinas pendientes de {replaceable.length === 1 ? "esta semana" : `estas ${replaceable.length} semanas`}:{" "}
            {replaceable.map((t) => t.label).join(" · ")}.
            {targets.some((t) => t.blocked) &&
              ` Se salta ${targets.filter((t) => t.blocked).map((t) => t.label).join(" · ")} porque ya tiene sesiones hechas, omitidas o movidas.`}{" "}
            Los cambios que hayas hecho a mano en ellas se pierden.
          </p>
        )}

        {error && (
          <p ref={errorRef} className="sh-hint sh-hint-warn" role="alert">
            {error}
          </p>
        )}

        <div className="edit-actions">
          <button type="button" className="sh-btn sh-btn-secondary" onClick={() => router.push(`/semana?w=${start}`)} disabled={pending}>
            Cancelar
          </button>
          <button
            type="button"
            className="sh-btn sh-btn-primary"
            disabled={pending}
            onClick={() => (needsConfirm && !confirming ? setConfirming(true) : save())}
          >
            {pending ? "Guardando…" : needsConfirm && confirming ? "Sí, reemplazar y guardar" : "Guardar semana"}
          </button>
        </div>
      </section>
    </div>
  );
}
