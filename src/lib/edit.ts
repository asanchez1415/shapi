import type { SportSlug } from "./types";

// Edición de una sesión: convierte la estructura (jsonb) a campos de formulario y de vuelta.
// Se usa en el formulario (cliente) y otra vez en el servidor, que es quien valida de verdad.
// Todo lo que el formulario no muestra se conserva tal cual.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type J = Record<string, any>;

export type EditKind = "strength" | "skill" | "plyo" | "intervals" | "steady-run" | "cycling" | "none";

export type EditRow = { src: number; v: Record<string, string> };

export type EditPayload = {
  name: string;
  time: string; // "" o "HH:MM"
  notes: string;
  duration: string; // "" = calcularla sola
  f: Record<string, string>; // campos sueltos según el tipo
  rows: EditRow[]; // ejercicios o bloques; src = posición original (-1 si es nuevo)
};

export function editKind(sport: SportSlug, st: J): EditKind {
  if (sport === "running") return st.type === "intervals" ? "intervals" : "steady-run";
  if (sport === "ciclismo") return "cycling";
  if (sport === "plyo" || st.type === "plyo") return "plyo";
  if (Array.isArray(st.blocks)) return "skill";
  if (Array.isArray(st.exercises)) return "strength";
  return "none";
}

/* ---------- Formato ---------- */

const str = (v: unknown) => (v === undefined || v === null ? "" : String(v));
const dec = (n: unknown) => str(n).replace(".", ",");
const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}`;

function setText(set: J): string {
  if (set.reps !== undefined && set.reps !== null) return String(set.reps);
  if (set.reps_min !== undefined && set.reps_max !== undefined) {
    return set.reps_min === set.reps_max ? String(set.reps_min) : `${set.reps_min}-${set.reps_max}`;
  }
  return str(set.reps_text);
}

const setsText = (sets: J[]) => sets.map(setText).join(", ");
const normalizeList = (text: string) => text.split(/[,;·\s]+/).filter(Boolean).join(", ");

function rangeText(r: J | undefined): string {
  if (!r) return "";
  const lo = r.min;
  const hi = r.max;
  if (lo === undefined && hi === undefined) return "";
  if (lo === undefined || hi === undefined || lo === hi) return str(lo ?? hi);
  return `${lo}-${hi}`;
}

/** Estructura -> campos del formulario. */
export function toPayload(
  sport: SportSlug,
  st: J,
  base: { name: string; time: string | null; notes: string | null },
): EditPayload {
  const kind = editKind(sport, st);
  const payload: EditPayload = {
    name: base.name,
    time: base.time ?? "",
    notes: base.notes ?? "",
    duration: str(st.duration_min),
    f: {},
    rows: [],
  };

  if (kind === "strength") {
    payload.rows = (st.exercises as J[]).map((e, i) => ({
      src: i,
      v: {
        name: str(e.name),
        reps: setsText(Array.isArray(e.sets) ? e.sets : []),
        load: dec(e.load_kg),
        rest: str(e.rest_sec),
        note: str(e.note),
      },
    }));
  } else if (kind === "skill") {
    payload.rows = (st.blocks as J[]).map((b, i) => ({
      src: i,
      v: { name: str(b.name), detail: str(b.detail), time_text: str(b.time_text) },
    }));
  } else if (kind === "plyo") {
    payload.f = { warmup: str(st.warmup), after: str(st.after), rest: str(st.rest_sec) };
    payload.rows = (Array.isArray(st.work) ? (st.work as J[]) : []).map((w, i) => ({
      src: i,
      v: { name: str(w.name), sets: str(w.sets), reps: str(w.reps ?? w.reps_text) },
    }));
  } else if (kind === "intervals") {
    const pace = st.pace_range_sec_km as J | undefined;
    const rec = st.recovery_sec as J | undefined;
    payload.f = {
      reps: str(st.reps),
      distance_m: str(st.distance_m),
      pace_fast: pace?.min !== undefined ? clock(pace.min) : "",
      pace_slow: pace?.max !== undefined ? clock(pace.max) : "",
      warmup_min: str(st.warmup_min),
      cooldown_min: str(st.cooldown_min),
      rec_min: str(rec?.min),
      rec_max: str(rec?.max),
    };
  } else if (kind === "steady-run") {
    payload.f = { hr: rangeText(st.hr_range) };
  } else if (kind === "cycling") {
    payload.f = {
      distance: dec(st.distance_km),
      hr: st.hr_target !== undefined ? str(st.hr_target) : rangeText(st.hr_range),
      cadence: rangeText(st.cadence_rpm),
      bike: str(st.bike),
    };
  }
  return payload;
}

/* ---------- Validación y reconstrucción ---------- */

class Invalid extends Error {}

function int(label: string, text: string | undefined, min: number, max: number, required = false): number | null {
  const t = (text ?? "").trim();
  if (!t) {
    if (required) throw new Invalid(`Falta ${label}.`);
    return null;
  }
  if (!/^\d+$/.test(t)) throw new Invalid(`${label}: usa solo números enteros.`);
  const n = Number(t);
  if (n < min || n > max) throw new Invalid(`${label}: debe estar entre ${min} y ${max}.`);
  return n;
}

function decimal(label: string, text: string | undefined, min: number, max: number): number | null {
  const t = (text ?? "").trim().replace(",", ".");
  if (!t) return null;
  if (!/^\d+(\.\d+)?$/.test(t)) throw new Invalid(`${label}: escribe un número, por ejemplo 33,5.`);
  const n = Number(t);
  if (n < min || n > max) throw new Invalid(`${label}: debe estar entre ${min} y ${max}.`);
  return n;
}

function pace(label: string, text: string | undefined): number | null {
  const t = (text ?? "").trim();
  if (!t) return null;
  const m = t.match(/^(\d{1,2}):([0-5]\d)$/);
  if (!m) throw new Invalid(`${label}: usa el formato 4:15.`);
  return Number(m[1]) * 60 + Number(m[2]);
}

/** "140" o "140-150" -> {min,max} */
function rangeInput(label: string, text: string | undefined, min: number, max: number): { min: number; max: number } | null {
  const t = (text ?? "").trim();
  if (!t) return null;
  const m = t.match(/^(\d{1,3})(?:\s*-\s*(\d{1,3}))?$/);
  if (!m) throw new Invalid(`${label}: escribe un número o un rango, por ejemplo 140-150.`);
  const lo = Number(m[1]);
  const hi = m[2] ? Number(m[2]) : lo;
  if (lo > hi) throw new Invalid(`${label}: el primer número debe ser el menor.`);
  if (lo < min || hi > max) throw new Invalid(`${label}: debe estar entre ${min} y ${max}.`);
  return { min: lo, max: hi };
}

function parseSets(label: string, text: string): J[] {
  const tokens = normalizeList(text).split(", ").filter(Boolean);
  if (tokens.length > 12) throw new Invalid(`${label}: máximo 12 series.`);
  return tokens.map((t) => {
    let m = t.match(/^(\d{1,3})$/);
    if (m) return { reps: Number(m[1]) };
    m = t.match(/^(\d{1,3})-(\d{1,3})$/);
    if (m && Number(m[1]) <= Number(m[2])) return { reps_min: Number(m[1]), reps_max: Number(m[2]) };
    throw new Invalid(`${label}: escribe las repeticiones de cada serie separadas por coma, por ejemplo 10, 10, 9.`);
  });
}

function setOrDelete(obj: J, key: string, value: unknown) {
  if (value === null || value === undefined || value === "") delete obj[key];
  else obj[key] = value;
}

export type BuildResult =
  | { ok: true; name: string; time: string | null; notes: string | null; structure: J }
  | { ok: false; error: string };

/** Valida lo que llega del formulario y arma la nueva estructura sobre la original. */
export function buildStructure(sport: SportSlug, original: J, p: EditPayload): BuildResult {
  try {
    const name = (p.name ?? "").trim();
    if (!name) throw new Invalid("Falta el nombre. Escribe uno corto, por ejemplo «Rodaje suave».");
    if (name.length > 80) throw new Invalid("El nombre es muy largo (máximo 80 letras).");

    const time = (p.time ?? "").trim();
    if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Invalid("La hora no es válida.");

    const notes = (p.notes ?? "").trim();
    if (notes.length > 1000) throw new Invalid("Las notas son muy largas (máximo 1000 letras).");

    const st: J = structuredClone(original ?? {});
    const kind = editKind(sport, st);
    const f = p.f ?? {};
    const rows = Array.isArray(p.rows) ? p.rows : [];
    if (rows.length > 30) throw new Invalid("Demasiadas filas.");

    const orig = (key: string, src: number): J => {
      const list = original?.[key];
      return Array.isArray(list) && src >= 0 && src < list.length && list[src] && typeof list[src] === "object"
        ? structuredClone(list[src])
        : {};
    };

    if (kind === "strength") {
      if (!rows.length) throw new Invalid("Deja al menos un ejercicio.");
      st.exercises = rows.map((r, i) => {
        const n = i + 1;
        const base = orig("exercises", r.src);
        const ex = (r.v?.name ?? "").trim();
        if (!ex) throw new Invalid(`Falta el nombre del ejercicio ${n}.`);
        const repsInput = (r.v?.reps ?? "").trim();
        let sets: J[];
        if (!repsInput) {
          if (base.active !== false) throw new Invalid(`«${ex}»: escribe las repeticiones de cada serie.`);
          sets = [];
        } else if (Array.isArray(base.sets) && setsText(base.sets) === normalizeList(repsInput)) {
          sets = base.sets; // sin cambios: se conserva tal cual
        } else {
          sets = parseSets(`«${ex}»`, repsInput);
        }
        const out: J = { ...base, name: ex, sets };
        setOrDelete(out, "load_kg", decimal(`«${ex}» carga`, r.v?.load, 0, 1000));
        setOrDelete(out, "rest_sec", int(`«${ex}» descanso`, r.v?.rest, 0, 1800));
        setOrDelete(out, "note", (r.v?.note ?? "").trim().slice(0, 120));
        return out;
      });
    } else if (kind === "skill") {
      if (!rows.length) throw new Invalid("Deja al menos un bloque.");
      st.blocks = rows.map((r, i) => {
        const base = orig("blocks", r.src);
        const bn = (r.v?.name ?? "").trim();
        if (!bn) throw new Invalid(`Falta el nombre del bloque ${i + 1}.`);
        const out: J = { ...base, name: bn };
        setOrDelete(out, "detail", (r.v?.detail ?? "").trim().slice(0, 300));
        setOrDelete(out, "time_text", (r.v?.time_text ?? "").trim().slice(0, 30));
        return out;
      });
    } else if (kind === "plyo") {
      setOrDelete(st, "warmup", (f.warmup ?? "").trim().slice(0, 200));
      setOrDelete(st, "after", (f.after ?? "").trim().slice(0, 200));
      setOrDelete(st, "rest_sec", int("El descanso", f.rest, 0, 1800));
      st.work = rows.map((r, i) => {
        const base = orig("work", r.src);
        const wn = (r.v?.name ?? "").trim();
        if (!wn) throw new Invalid(`Falta el nombre del ejercicio ${i + 1}.`);
        const out: J = { ...base, name: wn };
        out.sets = int(`«${wn}» series`, r.v?.sets, 1, 20, true);
        const reps = (r.v?.reps ?? "").trim();
        if (/^\d{1,3}$/.test(reps)) {
          out.reps = Number(reps);
          delete out.reps_text;
        } else if (reps) {
          out.reps_text = reps.slice(0, 20);
          delete out.reps;
        } else {
          delete out.reps;
          delete out.reps_text;
        }
        return out;
      });
    } else if (kind === "intervals") {
      st.reps = int("Las repeticiones", f.reps, 1, 50, true);
      st.distance_m = int("La distancia", f.distance_m, 50, 20000, true);
      const fast = pace("Ritmo más rápido", f.pace_fast);
      const slow = pace("Ritmo más lento", f.pace_slow);
      if ((fast === null) !== (slow === null)) throw new Invalid("Completa los dos ritmos o deja ambos vacíos.");
      if (fast !== null && slow !== null) {
        if (fast > slow) throw new Invalid("El ritmo más rápido debe ser menor que el más lento.");
        st.pace_range_sec_km = { min: fast, max: slow };
      } else delete st.pace_range_sec_km;
      setOrDelete(st, "warmup_min", int("El calentamiento", f.warmup_min, 0, 120));
      setOrDelete(st, "cooldown_min", int("El enfriamiento", f.cooldown_min, 0, 120));
      const rmin = int("La recuperación mínima", f.rec_min, 0, 1800);
      const rmax = int("La recuperación máxima", f.rec_max, 0, 1800);
      if (rmin !== null || rmax !== null) {
        const lo = rmin ?? (rmax as number);
        const hi = rmax ?? lo;
        if (lo > hi) throw new Invalid("La recuperación mínima no puede superar la máxima.");
        st.recovery_sec = { min: lo, max: hi };
      } else delete st.recovery_sec;
    } else if (kind === "steady-run") {
      const hr = rangeInput("La frecuencia cardíaca", f.hr, 40, 230);
      if (hr) st.hr_range = hr;
      else delete st.hr_range;
    } else if (kind === "cycling") {
      setOrDelete(st, "distance_km", decimal("La distancia", f.distance, 1, 1000));
      const hr = rangeInput("La frecuencia cardíaca", f.hr, 40, 230);
      delete st.hr_target;
      delete st.hr_range;
      if (hr) {
        if (hr.min === hr.max) st.hr_target = hr.min;
        else st.hr_range = hr;
      }
      const cad = rangeInput("La cadencia", f.cadence, 20, 200);
      if (cad) st.cadence_rpm = cad;
      else delete st.cadence_rpm;
      setOrDelete(st, "bike", (f.bike ?? "").trim().slice(0, 60));
    }

    // Duración propia: si se deja vacía, se vuelve a calcular sola.
    setOrDelete(st, "duration_min", int("La duración", p.duration, 1, 600));

    return { ok: true, name, time: time || null, notes: notes || null, structure: st };
  } catch (e) {
    if (e instanceof Invalid) return { ok: false, error: e.message };
    throw e;
  }
}
