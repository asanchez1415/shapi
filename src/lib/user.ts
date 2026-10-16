import type { User } from "@supabase/supabase-js";

/** Primer nombre de la persona; nunca el correo. */
export function firstName(user: User | null | undefined): string {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const given = typeof meta.given_name === "string" ? meta.given_name : "";
  const full =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    "";
  return given.trim() || full.trim().split(/\s+/)[0] || "Mi cuenta";
}
