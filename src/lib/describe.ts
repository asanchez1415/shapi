import type { SportSlug } from "./types";

// Resume una sesión a partir de su estructura (jsonb): cuántos ejercicios tiene,
// cuánto dura aproximadamente y qué se muestra en el detalle.
// La tarjeta de la semana solo usa el resumen; el detalle muestra todo.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type J = Record<string, any>;

export type DetailRow = { label: string; value?: string; note?: string };
export type DetailSection = { title: string; kind: "exercises" | "rows"; rows: DetailRow[] };

/** Filas de la tarjeta: sin listar ejercicios. */
export type CardLines = {
  /** Fila principal (distancia en cardio, cantidad de ejercicios en el resto). */
  lead: string | null;
  /** Qué es la fila principal, para elegir su ícono. */
  leadKind: "distance" | "count" | "time" | null;
  /** Fila propia con la frecuencia cardíaca o el ritmo. */
  side: string | null;
  sideKind: "hr" | "pace" | null;
  /** Fila propia con el tiempo. */
  duration: string | null;
};

export type Described = {
  card: CardLines;
  /** Cantidad de ejercicios (o bloques) para el detalle. */
  count: { value: number; label: string } | null;
  minutes: number | null;
  /** true si la duración es una estimación y no un dato del plan. */
  estimated: boolean;
  sections: DetailSection[];
};

// Supuestos de las estimaciones (se pueden afinar más adelante):
const CYCLING_KMH = 27; // velocidad media en ruta
const SET_WORK_SEC = 45; // lo que dura una serie de fuerza
const PLYO_SET_SEC = 20;
const STRENGTH_WARMUP_MIN = 5;
const PLYO_AFTER_MIN = 10;

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Promedio de un rango {min,max}; acepta que falte uno de los dos. */
function mid(range: J | undefined): number | null {
  if (!range) return null;
  const lo = num(range.min);
  const hi = num(range.max);
  if (lo !== null && hi !== null) return (lo + hi) / 2;
  return lo ?? hi;
}

function rangeText(range: J | undefined, fmt: (n: number) => string = String): string | null {
  if (!range) return null;
  const lo = num(range.min);
  const hi = num(range.max);
  if (lo === null && hi === null) return null;
  if (lo === null || hi === null || lo === hi) return fmt((lo ?? hi) as number);
  return `${fmt(lo)}–${fmt(hi)}`;
}

const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}`;
const roundTo5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);

export function formatMinutes(min: number, estimated: boolean): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  const text = h ? (m ? `${h} h ${m} min` : `${h} h`) : `${m} min`;
  return estimated ? `~${text}` : text;
}

/** "6-7 min" -> 6,5 */
function minutesFromText(text: unknown): number {
  if (typeof text !== "string") return 0;
  const m = text.match(/(\d+(?:[.,]\d+)?)(?:\s*-\s*(\d+(?:[.,]\d+)?))?/);
  if (!m) return 0;
  const a = parseFloat(m[1].replace(",", "."));
  const b = m[2] ? parseFloat(m[2].replace(",", ".")) : a;
  return (a + b) / 2;
}

function repsText(set: J): string {
  if (set.reps !== undefined && set.reps !== null) return String(set.reps);
  if (set.reps_text) return String(set.reps_text);
  const r = rangeText({ min: set.reps_min, max: set.reps_max });
  return r ?? "";
}

function setsText(sets: J[]): string {
  if (!sets.length) return "";
  const first = repsText(sets[0]);
  if (sets.every((s) => repsText(s) === first)) return `${sets.length} × ${first}`;
  return sets.map(repsText).join(" · ");
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function describeStrength(st: J) {
  const all: J[] = Array.isArray(st.exercises) ? st.exercises : [];
  const active = all.filter((e) => e.active !== false);

  let seconds = 0;
  for (const e of active) {
    const n = Array.isArray(e.sets) ? e.sets.length : 0;
    seconds += n * (SET_WORK_SEC + (num(e.rest_sec) ?? 90));
  }
  const minutes = active.length ? roundTo5(seconds / 60 + STRENGTH_WARMUP_MIN) : null;

  const rows: DetailRow[] = active.map((e) => {
    const sets: J[] = Array.isArray(e.sets) ? e.sets : [];
    const load = num(e.load_kg);
    const rest = num(e.rest_sec);
    const plan = [
      setsText(sets),
      load !== null ? `${load} kg${e.per_side ? " por lado" : ""}` : e.per_side ? "por lado" : "",
      rest !== null ? `descanso ${clock(rest)}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
    return {
      label: String(e.name ?? "Ejercicio"),
      value: plan,
      note: [e.optional ? "Opcional" : "", e.note ?? ""].filter(Boolean).join(" · ") || undefined,
    };
  });

  return {
    count: { value: active.length, label: plural(active.length, "ejercicio", "ejercicios") },
    minutes,
    sections: [{ title: "Ejercicios", kind: "exercises" as const, rows }],
  };
}

function describeSkill(st: J) {
  const blocks: J[] = Array.isArray(st.blocks) ? st.blocks : [];
  const explicit = num(st.duration_min);
  const summed = blocks.reduce((acc, b) => acc + minutesFromText(b.time_text), 0);
  const rows: DetailRow[] = blocks.map((b) => ({
    label: String(b.name ?? "Bloque"),
    value: b.time_text ? String(b.time_text) : undefined,
    note: [b.detail, rangeText(b.rest_sec, (n) => `${n} s`) ? `descanso ${rangeText(b.rest_sec, (n) => `${n} s`)}` : ""]
      .filter(Boolean)
      .join(" · "),
  }));
  return {
    count: { value: blocks.length, label: plural(blocks.length, "bloque", "bloques") },
    minutes: explicit ?? (summed ? roundTo5(summed) : null),
    exact: explicit !== null,
    sections: [{ title: "Bloques", kind: "rows" as const, rows }],
  };
}

function describePlyo(st: J) {
  const work: J[] = Array.isArray(st.work) ? st.work : [];
  const rest = num(st.rest_sec) ?? 90;
  const warm = minutesFromText(st.warmup);
  let seconds = 0;
  for (const w of work) seconds += (num(w.sets) ?? 0) * (PLYO_SET_SEC + rest);
  const minutes = roundTo5(warm + seconds / 60 + (st.after ? PLYO_AFTER_MIN : 0));

  const rows: DetailRow[] = [];
  if (st.warmup) rows.push({ label: "Calentamiento", note: String(st.warmup) });
  for (const w of work) {
    rows.push({
      label: String(w.name ?? "Ejercicio"),
      value: [`${w.sets} × ${w.reps ?? w.reps_text ?? ""}`.trim(), `descanso ${clock(rest)}`].join(" · "),
    });
  }
  if (st.after) rows.push({ label: "Después", note: String(st.after) });

  return {
    count: { value: work.length, label: plural(work.length, "ejercicio", "ejercicios") },
    minutes,
    sections: [{ title: "Plan", kind: "rows" as const, rows }],
  };
}

function describeRunning(st: J) {
  const rows: DetailRow[] = [];
  let minutes: number | null = null;
  let exact = false;
  let lead: string | null = null;
  let side: string | null = null;
  let sideKind: "hr" | "pace" | null = null;

  if (st.type === "intervals") {
    const reps = num(st.reps) ?? 0;
    const dist = num(st.distance_m) ?? 0;
    const pace = mid(st.pace_range_sec_km);
    const rec = mid(st.recovery_sec) ?? 0;
    const warm = num(st.warmup_min) ?? 0;
    const cool = num(st.cooldown_min) ?? 0;
    if (pace !== null) {
      minutes = roundTo5(warm + cool + (reps * (dist / 1000) * pace) / 60 + (Math.max(reps - 1, 0) * rec) / 60);
    }
    const paceTxt = rangeText(st.pace_range_sec_km, clock);
    if (warm) rows.push({ label: "Calentamiento", value: `${warm} min` });
    lead = `${reps} × ${dist} m`;
    side = paceTxt;
    sideKind = side ? "pace" : null;
    rows.push({
      label: st.variant ? `Series · ${st.variant}` : "Series",
      value: `${reps} × ${dist} m${paceTxt ? ` a ${paceTxt} /km` : ""}`,
    });
    const recTxt = rangeText(st.recovery_sec, clock);
    if (recTxt) rows.push({ label: "Recuperación", value: recTxt, note: st.recovery_kind ?? undefined });
    if (cool) rows.push({ label: "Enfriamiento", value: `${cool} min` });
  } else {
    const dur = num(st.duration_min);
    if (dur !== null) {
      minutes = dur;
      exact = true;
    }
    if (dur !== null) rows.push({ label: "Duración", value: `${dur} min`, note: st.driver === "tiempo" ? "Manda el tiempo" : undefined });
    const hr = rangeText(st.hr_range);
    if (hr) {
      side = hr;
      sideKind = "hr";
    }
    if (hr) rows.push({ label: "Frecuencia cardíaca", value: `${hr} ppm`, note: st.hr_cap ? `Tope ${st.hr_cap}` : undefined });
    if (st.zone) rows.push({ label: "Zona", value: String(st.zone) });
  }
  return { count: null, minutes, exact, lead, side, sideKind, sections: [{ title: "Plan", kind: "rows" as const, rows }] };
}

function describeCycling(st: J) {
  const km = num(st.distance_km);
  const dur = num(st.duration_min);
  const minutes = dur ?? (km !== null ? roundTo5((km / CYCLING_KMH) * 60) : null);
  const rows: DetailRow[] = [];
  if (km !== null) rows.push({ label: "Distancia", value: `${km} km` });
  const hr = num(st.hr_target) !== null ? String(st.hr_target) : rangeText(st.hr_range);
  if (hr) rows.push({ label: "Frecuencia cardíaca", value: `${hr} ppm` });
  const cad = rangeText(st.cadence_rpm);
  const lead = km !== null ? `${km} km` : null;
  const side = hr;
  if (cad) rows.push({ label: "Cadencia", value: `${cad} rpm` });
  if (st.bike) rows.push({ label: "Bicicleta", value: String(st.bike) });
  return { count: null, minutes, exact: dur !== null, lead, side, sideKind: (side ? "hr" : null) as "hr" | null, sections: [{ title: "Plan", kind: "rows" as const, rows }] };
}

export function describeSession(sport: SportSlug, structure: unknown, target: string | null): Described {
  const st: J = structure && typeof structure === "object" ? (structure as J) : {};

  let base: {
    count: Described["count"];
    minutes: number | null;
    exact?: boolean;
    lead?: string | null;
    side?: string | null;
    sideKind?: "hr" | "pace" | null;
    sections: DetailSection[];
  };

  if (sport === "running") base = describeRunning(st);
  else if (sport === "ciclismo") base = describeCycling(st);
  else if (sport === "plyo") base = describePlyo(st);
  else if (st.type === "skill" || Array.isArray(st.blocks)) base = describeSkill(st);
  else if (Array.isArray(st.exercises)) base = describeStrength(st);
  else base = { count: null, minutes: null, sections: [] };

  // Una duración escrita a mano en el plan manda sobre cualquier estimación.
  const own = num(st.duration_min);
  const minutes = own ?? base.minutes;
  const estimated = minutes !== null && own === null && !base.exact;
  const duration = minutes !== null ? formatMinutes(minutes, estimated) : null;

  // Tarjeta: la distancia (o la cantidad de ejercicios) arriba, la frecuencia
  // cardíaca o el ritmo a su derecha, y el tiempo en su propia fila.
  // Sin distancia (running por tiempo), el tiempo pasa a ser la fila principal.
  let lead = base.count ? base.count.label : (base.lead ?? null);
  let leadKind: CardLines["leadKind"] = lead ? (base.count ? "count" : "distance") : null;
  let durationRow = duration;
  if (!base.count && !lead) {
    lead = duration ?? target;
    leadKind = duration ? "time" : null;
    durationRow = null;
  }

  return {
    card: { lead, leadKind, side: base.side ?? null, sideKind: base.sideKind ?? null, duration: durationRow },
    count: base.count,
    minutes,
    estimated,
    sections: base.sections,
  };
}
