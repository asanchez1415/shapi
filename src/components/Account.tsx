import { signOut } from "@/app/(app)/actions";
import { NavIcon } from "./icons";

// Quién inició sesión (solo el nombre) y el botón para cerrar sesión, como ícono.
export function Account({ name }: { name: string }) {
  return (
    <form action={signOut} className="account">
      <span className="account-name">
        <NavIcon name="user" size={20} />
        <span className="account-text">{name}</span>
      </span>
      <button type="submit" className="ib" aria-label="Cerrar sesión" title="Cerrar sesión">
        <NavIcon name="logout" size={20} />
      </button>
    </form>
  );
}
