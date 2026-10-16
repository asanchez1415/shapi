"use client";

import { useEffect } from "react";

// Hoja inferior en celular y ventana centrada en notebook (según el CSS).
export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <>
      <div className="sh-scrim" onClick={onClose} />
      <div className="sh-sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sh-sheet-grip" />
        {title && <h2 className="sh-sheet-title">{title}</h2>}
        {children}
      </div>
    </>
  );
}
