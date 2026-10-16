import { redirect } from "next/navigation";

// El proxy lleva a /login si no hay sesión; con sesión, aquí se entra a Hoy.
export default function Home() {
  redirect("/hoy");
}
