"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavIcon } from "./icons";

const ITEMS = [
  { key: "hoy", label: "Hoy", href: "/hoy" },
  { key: "semana", label: "Semana", href: "/semana" },
] as const;

function useActive() {
  const pathname = usePathname();
  return ITEMS.find((i) => pathname.startsWith(i.href))?.key;
}

// Celular: barra inferior.
export function TabBar() {
  const active = useActive();
  return (
    <nav className="sh-tabbar" aria-label="Principal">
      {ITEMS.map((it) => (
        <Link
          key={it.key}
          href={it.href}
          className="sh-tab"
          aria-current={it.key === active ? "page" : undefined}
        >
          <NavIcon name={it.key} />
          <span>{it.label}</span>
        </Link>
      ))}
    </nav>
  );
}

// Notebook: menú lateral.
export function SideNav({ footer }: { footer?: React.ReactNode }) {
  const active = useActive();
  return (
    <nav className="sh-sidenav" aria-label="Principal">
      <div className="sh-sidenav-brand">Shapi</div>
      <div className="sh-sidenav-list">
        {ITEMS.map((it) => (
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
