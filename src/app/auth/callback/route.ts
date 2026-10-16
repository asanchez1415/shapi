import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Google devuelve aquí con un código; se cambia por la sesión y se entra a la app.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Solo rutas internas: evita redirigir a otro sitio.
  const nextParam = searchParams.get("next") ?? "/hoy";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/hoy";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
