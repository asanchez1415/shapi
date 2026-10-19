"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavIcon } from "./icons";

export const NAV_ITEMS = [
  { key: "hoy", label: "Hoy", href: "/hoy" },
  { key: "semana", label: "Semana", href: "/semana" },
] as const;

export function useActive() {
  const pathname = usePathname();
  return NAV_ITEMS.find((i) => pathname.startsWith(i.href))?.key;
}

// Notebook: menú lateral.
export function SideNav({ footer }: { footer?: React.ReactNode }) {
  const active = useActive();
  return (
    <nav className="sh-sidenav" aria-label="Principal">
      <div className="sh-sidenav-brand">Shapi</div>
      <div className="sh-sidenav-list">
        {NAV_ITEMS.map((it) => (
          <Link
            key={it.key}
            href={it.href}
            className="sh-sidenav-item"
            aria-current={it.key === active ? "page" : undefined}
          >
            <NavIcon name={it.key} size={20} />
            {it.label}
          </Link>
        ))}
      </div>
      {footer && <div className="sh-sidenav-foot">{footer}</div>}
    </nav>
  );
}
