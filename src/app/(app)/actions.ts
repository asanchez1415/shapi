"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { todayISO } from "@/lib/dates";
import { describeSession } from "@/lib/describe";
import { buildStructure, type EditPayload } from "@/lib/edit";
import { canMarkDone, doneReason } from "@/lib/rules";
import { createClient } from "@/lib/supabase/server";
import type { SportSlug, Status } from "@/lib/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// "movida" no se elige a mano: la crea el flujo de mover.
const SETTABLE: Status[] = ["pendiente", "hecha", "dificultad", "omitida"];

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/** Cambia el estado de una sesión aplicando las reglas del diseño. */
export async function setStatus(id: string, status: Status): Promise<ActionResult> {
  if (!UUID.test(id) || !SETTABLE.includes(status)) {
    return { ok: false, error: "No se pudo cambiar el estado." };
  }

  const supabase = await createClient();
  const { data: current, error: readError } = await supabase
    .from("sessions")
    .select("id, status, scheduled_date")
    .eq("id", id)
    .maybeSingle();
  if (readError || !current) return { ok: false, error: "No encontramos la sesión." };

  if (current.status === "movida") {
    return { ok: false, error: "Una sesión movida no cambia de estado; mira la nueva." };
  }
  if ((status === "hecha" || status === "dificultad") && !canMarkDone(current.scheduled_date, todayISO())) {
    return { ok: false, error: doneReason(current.scheduled_date, todayISO()) ?? "Todavía no se puede marcar." };
  }

  const now = new Date().toISOString();
  const { data: updated, error } = await supabase
    .from("sessions")
    .update({
      status,
      status_changed_at: now,
      updated_at: now,
      // El motivo solo vale mientras la sesión sigue omitida.
      ...(status === "omitida" ? {} : { skip_reason: null }),
    })
    .eq("id", id)
    .select("id");
  if (error || !updated?.length) return { ok: false, error: "No se pudo guardar. Intenta de nuevo." };

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Guarda los cambios de una sesión pendiente. El día no se toca aquí: se mueve con «Mover». */
export async function updateSession(id: string, payload: EditPayload): Promise<ActionResult> {
  if (!UUID.test(id) || !payload || typeof payload !== "object") {
    return { ok: false, error: "No se pudo guardar." };
  }

  const supabase = await createClient();
  const { data: current, error: readError } = await supabase
    .from("sessions")
    .select("id, status, target, structure, sports(slug)")
    .eq("id", id)
    .maybeSingle();
  if (readError || !current) return { ok: false, error: "No encontramos la sesión." };
  if (current.status !== "pendiente") {
    return { ok: false, error: "Solo se editan sesiones pendientes." };
  }

  const sportRel = current.sports as unknown as { slug: SportSlug } | { slug: SportSlug }[] | null;
  const sport = (Array.isArray(sportRel) ? sportRel[0]?.slug : sportRel?.slug) ?? "running";

  const built = buildStructure(sport, (current.structure ?? {}) as Record<string, unknown>, payload);
  if (!built.ok) return { ok: false, error: built.error };

  // La línea de objetivo se mantiene al día con lo que se editó.
  const card = describeSession(sport, built.structure, null).card;
  const target = [card.lead, card.side].filter(Boolean).join(" · ") || current.target;

  const { data: updated, error } = await supabase
    .from("sessions")
    .update({
      name: built.name,
      scheduled_time: built.time,
      notes: built.notes,
      structure: built.structure,
      target,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id");
  if (error || !updated?.length) return { ok: false, error: "No se pudo guardar. Intenta de nuevo." };

  revalidatePath("/", "layout");
  return { ok: true };
}
