import { hasSupabaseEnv } from "@/lib/supabase/env";
import { LoginButton } from "./LoginButton";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="login">
      <div className="login-box">
        <div className="login-head">
          <h1 className="login-brand">Shapi</h1>
          <p className="login-lead">Organiza tu entrenamiento sobre el calendario.</p>
        </div>

        <div className="login-actions">
          <LoginButton disabled={!hasSupabaseEnv} />
          {error && (
            <p className="sh-hint sh-hint-warn" role="alert">
              No se pudo iniciar sesión. Intenta de nuevo.
            </p>
          )}
          {!hasSupabaseEnv && (
            <p className="sh-hint">
              Falta configurar Supabase. Copia .env.example a .env.local y completa los valores.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
