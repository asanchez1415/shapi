"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "@/app/(app)/actions";
import { NAV_ITEMS, useActive } from "./AppNav";
import { NavIcon } from "./icons";

// Celular: un botón redondo abajo a la derecha que despliega el menú.
// Deja la pantalla casi completa para el contenido.
export function MobileMenu({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const active = useActive();
  const pathname = usePathname();

  // Se cierra al navegar y con Escape.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="mm">
      {open && <button type="button" className="mm-scrim" aria-label="Cerrar menú" onClick={() => setOpen(false)} />}

      {open && (
        <nav id="mm-panel" className="mm-panel" aria-label="Principal">
          {NAV_ITEMS.map((it) => (
            <Link key={it.key} href={it.href} className="mm-item" aria-current={it.key === active ? "page" : undefined}>
              <NavIcon name={it.key} size={20} />
              {it.label}
            </Link>
          ))}
          <form action={signOut} className="mm-account">
            <span className="mm-name">
              <NavIcon name="user" size={20} />
              <span className="account-text">{name}</span>
            </span>
            <button type="submit" className="ib" aria-label="Cerrar sesión" title="Cerrar sesión">
              <NavIcon name="logout" size={20} />
            </button>
          </form>
        </nav>
      )}

      <button
        type="button"
        className="mm-fab"
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={open}
        aria-controls="mm-panel"
        onClick={() => setOpen((o) => !o)}
      >
        <NavIcon name={open ? "close" : "menu"} size={22} />
      </button>
    </div>
  );
}
