import type { CardLines } from "./describe";

export const STATUSES = ["pendiente", "hecha", "dificultad", "movida", "omitida"] as const;
export type Status = (typeof STATUSES)[number];

export const SPORTS = [
  "running",
  "ciclismo",
  "calistenia",
  "gimnasio",
  "plyo",
  "handstand",
  "movilidad",
] as const;
export type SportSlug = (typeof SPORTS)[number];

export type SessionItem = {
  id: string;
  name: string;
  date: string; // AAAA-MM-DD
  time: string | null; // HH:MM
  status: Status;
  sport: SportSlug;
  /** Filas de la tarjeta (sin listar ejercicios). */
  card: CardLines;
  /** Para una sesión movida: fecha del duplicado. */
  movedTo: string | null;
  /** Para un duplicado: fecha de la original. */
  movedFrom: string | null;
};
