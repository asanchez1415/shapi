// Fechas como texto "AAAA-MM-DD". Sin horas ni zonas horarias de por medio:
// una sesión del lunes es del lunes en cualquier parte.

export const TZ = "America/Santiago";

const DIAS_LARGO = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function isISODate(value: string | undefined | null): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parse(value).getTime());
}

function parse(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Hoy en la zona horaria de la persona. */
export function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function addDays(iso: string, n: number): string {
  const d = parse(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toISO(d);
}

/** Lunes de la semana a la que pertenece la fecha. */
export function weekStart(iso: string): string {
  const dow = (parse(iso).getUTCDay() + 6) % 7;
  return addDays(iso, -dow);
}

export function weekDays(start: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function weekdayName(iso: string): string {
  return DIAS_LARGO[parse(iso).getUTCDay()];
}

export function dayNumber(iso: string): number {
  return parse(iso).getUTCDate();
}

export function monthShort(iso: string): string {
  return MESES[parse(iso).getUTCMonth()];
}

/** "jue 15 oct" */
export function formatShort(iso: string): string {
  return `${weekdayName(iso).slice(0, 3)} ${dayNumber(iso)} ${monthShort(iso)}`;
}

/** "12 – 18 oct" o "26 oct – 1 nov" */
export function formatWeekRange(start: string): string {
  const end = addDays(start, 6);
  const sameMonth = monthShort(start) === monthShort(end);
  return sameMonth
    ? `${dayNumber(start)} – ${dayNumber(end)} ${monthShort(end)}`
    : `${dayNumber(start)} ${monthShort(start)} – ${dayNumber(end)} ${monthShort(end)}`;
}
