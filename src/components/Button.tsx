import type { ReactNode } from "react";

/** Botón de Shapi. "primary": fondo acento, una por pantalla. "secondary": borde acento. */
export interface ButtonProps {
  variant?: "primary" | "secondary";
  disabled?: boolean;
  /** Ocupa todo el ancho. */
  block?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
  /** Verbo corto: "Guardar", "Hecha". */
  children: ReactNode;
}

export function Button({
  variant = "primary",
  disabled,
  block,
  type = "button",
  onClick,
  children,
}: ButtonProps) {
  const className = ["sh-btn", `sh-btn-${variant}`, block && "sh-btn-block"]
    .filter(Boolean)
    .join(" ");
  return (
    <button type={type} className={className} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}
