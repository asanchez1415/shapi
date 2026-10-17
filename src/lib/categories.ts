import { toPayload, type EditPayload } from "./edit";
import type { SportSlug } from "./types";

// Categorías para agregar una rutina a la semana. La categoría fija el deporte y qué campos
// tiene la rutina; el nombre («Bici easy», «Calistenia push»…) lo escribe la persona.

export type CategoryId = "ciclismo" | "calistenia" | "pliometria" | "running" | "pierna";
export type RunningVariant = "steady" | "intervals";

type Category = {
  id: CategoryId;
  label: string;
  sport: SportSlug;
  /** Ejemplo de nombre para el campo vacío. */
  example: string;
};

export const CATEGORIES: Category[] = [
  { id: "ciclismo", label: "Ciclismo", sport: "ciclismo", example: "Bici easy" },
  { id: "calistenia", label: "Calistenia", sport: "calistenia", example: "Calistenia push" },
  { id: "pliometria", label: "Pliometría", sport: "plyo", example: "Fútbol plyo" },
  { id: "running", label: "Running", sport: "running", example: "Running fondo" },
  { id: "pierna", label: "Pierna", sport: "gimnasio", example: "Pierna" },
];

export const categoryOf = (id: string | null | undefined) => CATEGORIES.find((c) => c.id === id);

/** Estructura vacía de una categoría: lo justo para que el formulario sepa qué campos mostrar. */
export function skeletonFor(id: CategoryId, variant: RunningVariant = "steady"): Record<string, unknown> {
  switch (id) {
    case "ciclismo":
      return { type: "steady" };
    case "calistenia":
    case "pierna":
      return { type: "strength", exercises: [] };
    case "pliometria":
      return { type: "plyo", work: [] };
    case "running":
      return { type: variant };
  }
}

const BLANK_ROW: Record<string, Record<string, string>> = {
  strength: { name: "", reps: "", load: "", rest: "90", note: "" },
  plyo: { name: "", sets: "3", reps: "" },
};

/** Campos iniciales de una rutina nueva de esa categoría. */
export function newPayload(id: CategoryId, variant: RunningVariant = "steady"): EditPayload {
  const cat = categoryOf(id)!;
  const payload = toPayload(cat.sport, skeletonFor(id, variant), { name: "", time: null, notes: null });
  if (id === "calistenia" || id === "pierna") payload.rows = [{ src: -1, v: { ...BLANK_ROW.strength } }];
  if (id === "pliometria") payload.rows = [{ src: -1, v: { ...BLANK_ROW.plyo } }];
  return payload;
}

export const BLANK_ROWS = BLANK_ROW;
