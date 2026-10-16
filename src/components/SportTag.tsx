import type { SportSlug } from "@/lib/types";
import { SPORT_META, SportIcon } from "./icons";

export function SportTag({ sport }: { sport: SportSlug }) {
  const meta = SPORT_META[sport] ?? SPORT_META.running;
  return (
    <span className="sh-sport">
      <span className="sh-dot" style={{ background: meta.color }} aria-hidden />
      <SportIcon sport={sport} size={18} />
      <span>{meta.label}</span>
    </span>
  );
}
