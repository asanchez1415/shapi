import { formatShort } from "./dates";

// Reglas de negocio del diseño. Se usan en pantalla (para deshabilitar y explicar)
// y otra vez en el servidor (para que nadie las salte).

/** Hecha y "hecha con dificultad" solo desde el día de la sesión en adelante. */
export function canMarkDone(date: string, today: string): boolean {
  return date <= today;
}

export function doneReason(date: string, today: string): string | null {
  return canMarkDone(date, today) ? null : `Disponible desde el ${formatShort(date)}`;
}
