"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { updateSession } from "@/app/(app)/actions";
import type { EditKind, EditPayload, EditRow } from "@/lib/edit";
import { SelectField, TextArea, TextField } from "./Fields";

const TIMES = (() => {
  const out: { value: string; label: string }[] = [{ value: "", label: "Sin hora" }];
  for (let h = 5; h <= 22; h++) {
    for (const m of [0, 15, 30, 45]) {
      const t = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      out.push({ value: t, label: t });
    }
  }
  return out;
})();

type Props = {
  id: string;
  kind: EditKind;
  initial: EditPayload;
  /** Para volver al detalle sin guardar. */
  backHref: string;
};

const ROW_LABELS: Record<"strength" | "skill" | "plyo", { item: string; add: string }> = {
  strength: { item: "Ejercicio", add: "Añadir ejercicio" },
  skill: { item: "Bloque", add: "Añadir bloque" },
  plyo: { item: "Ejercicio", add: "Añadir ejercicio" },
};

const EMPTY_ROW: Record<"strength" | "skill" | "plyo", Record<string, string>> = {
  strength: { name: "", reps: "", load: "", rest: "90", note: "" },
  skill: { name: "", detail: "", time_text: "" },
  plyo: { name: "", sets: "3", reps: "" },
};

export function SessionEditForm({ id, kind, initial, backHref }: Props) {
  const router = useRouter();
  const [p, setP] = useState<EditPayload>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const errorRef = useRef<HTMLParagraphElement>(null);

  const setF = (key: string, value: string) => setP((s) => ({ ...s, f: { ...s.f, [key]: value } }));
  const setRow = (i: number, key: string, value: string) =>
    setP((s) => ({
      ...s,
      rows: s.rows.map((r, j) => (j === i ? { ...r, v: { ...r.v, [key]: value } } : r)),
    }));
  const addRow = (type: "strength" | "skill" | "plyo") =>
    setP((s) => ({ ...s, rows: [...s.rows, { src: -1, v: { ...EMPTY_ROW[type] } }] }));
  const removeRow = (i: number) => setP((s) => ({ ...s, rows: s.rows.filter((_, j) => j !== i) }));

  // Si la hora actual no cae en un tramo de 15 minutos, se conserva igual.
  const timeOptions = TIMES.some((t) => t.value === p.time) ? TIMES : [...TIMES, { value: p.time, label: p.time }];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await updateSession(id, p);
      if (!res.ok) {
        setError(res.error);
        requestAnimationFrame(() => errorRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }));
        return;
      }
      router.push(backHref);
      router.refresh();
    });
  }

  const rowGroup = (type: "strength" | "skill" | "plyo", render: (r: EditRow, i: number) => React.ReactNode) => (
    <section className="edit-section">
      <h2 className="edit-h">{type === "skill" ? "Bloques" : type === "plyo" ? "Trabajo" : "Ejercicios"}</h2>
      {p.rows.map((r, i) => (
        <div key={i} className="edit-row">
          <div className="edit-row-head">
            <span className="edit-row-title">
              {ROW_LABELS[type].item} {i + 1}
            </span>
            <button type="button" className="sh-link" onClick={() => removeRow(i)}>
              Quitar
            </button>
          </div>
          {render(r, i)}
        </div>
      ))}
      <div>
        <button type="button" className="sh-btn sh-btn-secondary" onClick={() => addRow(type)}>
          {ROW_LABELS[type].add}
        </button>
      </div>
    </section>
  );

  return (
    <form className="edit-form" onSubmit={submit} noValidate>
      <TextField label="Nombre" value={p.name} maxLength={80} placeholder="Series en pista" onChange={(v) => setP({ ...p, name: v })} />

      <div className="edit-grid">
        <SelectField label="Hora" value={p.time} options={timeOptions} onChange={(v) => setP({ ...p, time: v })} />
        <TextField
          label="Duración"
          unit="min"
          inputMode="numeric"
          value={p.duration}
          placeholder="Automática"
          hint="Déjala vacía para que se calcule sola."
          onChange={(v) => setP({ ...p, duration: v.replace(/\D/g, "") })}
        />
      </div>

      {kind === "strength" &&
        rowGroup("strength", (r, i) => (
          <div className="stack">
            <TextField label="Nombre" value={r.v.name} maxLength={80} onChange={(v) => setRow(i, "name", v)} />
            <TextField
              label="Repeticiones por serie"
              value={r.v.reps}
              placeholder="10, 10, 9"
              hint="Una por serie, separadas por coma. Un rango sirve: 8-10."
              onChange={(v) => setRow(i, "reps", v)}
            />
            <div className="edit-grid">
              <TextField label="Carga" unit="kg" inputMode="decimal" value={r.v.load} onChange={(v) => setRow(i, "load", v)} />
              <TextField label="Descanso" unit="s" inputMode="numeric" value={r.v.rest} onChange={(v) => setRow(i, "rest", v.replace(/\D/g, ""))} />
            </div>
            <TextField label="Nota" value={r.v.note} maxLength={120} onChange={(v) => setRow(i, "note", v)} />
          </div>
        ))}

      {kind === "skill" &&
        rowGroup("skill", (r, i) => (
          <div className="stack">
            <TextField label="Nombre" value={r.v.name} maxLength={80} onChange={(v) => setRow(i, "name", v)} />
            <TextField label="Detalle" value={r.v.detail} maxLength={300} onChange={(v) => setRow(i, "detail", v)} />
            <TextField label="Tiempo" value={r.v.time_text} maxLength={30} placeholder="3 min" onChange={(v) => setRow(i, "time_text", v)} />
          </div>
        ))}

      {kind === "plyo" && (
        <>
          <section className="edit-section">
            <h2 className="edit-h">Plan</h2>
            <TextField label="Calentamiento" value={p.f.warmup} maxLength={200} onChange={(v) => setF("warmup", v)} />
            <TextField label="Después" value={p.f.after} maxLength={200} onChange={(v) => setF("after", v)} />
            <TextField label="Descanso entre series" unit="s" inputMode="numeric" value={p.f.rest} onChange={(v) => setF("rest", v.replace(/\D/g, ""))} />
          </section>
          {rowGroup("plyo", (r, i) => (
            <div className="stack">
              <TextField label="Nombre" value={r.v.name} maxLength={80} onChange={(v) => setRow(i, "name", v)} />
              <div className="edit-grid">
                <TextField label="Series" inputMode="numeric" value={r.v.sets} onChange={(v) => setRow(i, "sets", v.replace(/\D/g, ""))} />
                <TextField label="Repeticiones" value={r.v.reps} placeholder="5 o 3-4" maxLength={20} onChange={(v) => setRow(i, "reps", v)} />
              </div>
            </div>
          ))}
        </>
      )}

      {kind === "intervals" && (
        <section className="edit-section">
          <h2 className="edit-h">Series</h2>
          <div className="edit-grid">
            <TextField label="Repeticiones" inputMode="numeric" value={p.f.reps} onChange={(v) => setF("reps", v.replace(/\D/g, ""))} />
            <TextField label="Distancia" unit="m" inputMode="numeric" value={p.f.distance_m} onChange={(v) => setF("distance_m", v.replace(/\D/g, ""))} />
          </div>
          <div className="edit-grid">
            <TextField label="Ritmo más rápido" unit="/km" placeholder="4:15" value={p.f.pace_fast} onChange={(v) => setF("pace_fast", v)} />
            <TextField label="Ritmo más lento" unit="/km" placeholder="4:25" value={p.f.pace_slow} onChange={(v) => setF("pace_slow", v)} />
          </div>
          <div className="edit-grid">
            <TextField label="Recuperación mínima" unit="s" inputMode="numeric" value={p.f.rec_min} onChange={(v) => setF("rec_min", v.replace(/\D/g, ""))} />
            <TextField label="Recuperación máxima" unit="s" inputMode="numeric" value={p.f.rec_max} onChange={(v) => setF("rec_max", v.replace(/\D/g, ""))} />
          </div>
          <div className="edit-grid">
            <TextField label="Calentamiento" unit="min" inputMode="numeric" value={p.f.warmup_min} onChange={(v) => setF("warmup_min", v.replace(/\D/g, ""))} />
            <TextField label="Enfriamiento" unit="min" inputMode="numeric" value={p.f.cooldown_min} onChange={(v) => setF("cooldown_min", v.replace(/\D/g, ""))} />
          </div>
        </section>
      )}

      {kind === "steady-run" && (
        <section className="edit-section">
          <h2 className="edit-h">Plan</h2>
          <TextField label="Frecuencia cardíaca" unit="ppm" placeholder="140-150" hint="Un número o un rango." value={p.f.hr} onChange={(v) => setF("hr", v)} />
        </section>
      )}

      {kind === "cycling" && (
        <section className="edit-section">
          <h2 className="edit-h">Plan</h2>
          <div className="edit-grid">
            <TextField label="Distancia" unit="km" inputMode="decimal" value={p.f.distance} onChange={(v) => setF("distance", v)} />
            <TextField label="Frecuencia cardíaca" unit="ppm" placeholder="140 o 140-150" value={p.f.hr} onChange={(v) => setF("hr", v)} />
          </div>
          <div className="edit-grid">
            <TextField label="Cadencia" unit="rpm" placeholder="85-95" value={p.f.cadence} onChange={(v) => setF("cadence", v)} />
            <TextField label="Bicicleta" value={p.f.bike} maxLength={60} onChange={(v) => setF("bike", v)} />
          </div>
        </section>
      )}

      <TextArea label="Notas" value={p.notes} maxLength={1000} onChange={(v) => setP({ ...p, notes: v })} />

      {error && (
        <p ref={errorRef} className="sh-hint sh-hint-warn" role="alert">
          {error}
        </p>
      )}

      <div className="edit-actions">
        <Link href={backHref} className="sh-btn sh-btn-secondary">
          Cancelar
        </Link>
        <button type="submit" className="sh-btn sh-btn-primary" disabled={pending}>
          {pending ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}
