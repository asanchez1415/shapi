import { formatShort, weekStart } from "./dates";

// Reglas de negocio del diseño. Se usan en pantalla (para deshabilitar y explicar)
// y otra vez en el servidor (para que nadie las salte).

/** Hecha y "hecha con dificultad" solo desde el día de la sesión en adelante. */
export function canMarkDone(date: string, today: string): boolean {
  return date <= today;
}

export function doneReason(date: string, today: string): string | null {
  return canMarkDone(date, today) ? null : `Disponible desde el ${formatShort(date)}`;
}

/**
 * Mover a otro día: solo sesiones pendientes de la semana actual, que no sean ya una copia,
 * hacia un día de esa misma semana que no haya pasado. Devuelve el motivo si no se puede.
 */
export function moveBlockedReason(opts: {
  fromDate: string;
  toDate: string;
  today: string;
  isCopy: boolean;
}): string | null {
  const { fromDate, toDate, today, isCopy } = opts;
  if (isCopy) return "Esta sesión ya fue movida una vez; no se puede mover de nuevo.";
  const week = weekStart(today);
  if (weekStart(fromDate) !== week) return "Solo se mueven sesiones de la semana actual.";
  if (weekStart(toDate) !== week) return "Solo se puede mover dentro de la semana actual.";
  if (toDate < today) return "No se puede mover a un día que ya pasó.";
  return null;
}
