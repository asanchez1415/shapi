"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { createClient } from "@/lib/supabase/client";

export function LoginButton({ disabled }: { disabled?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    // Si todo sale bien, el navegador ya viene rumbo a Google.
    if (error) {
      setError("No se pudo conectar con Google. Intenta de nuevo.");
      setLoading(false);
    }
  }

  return (
    <>
      <Button block onClick={signIn} disabled={disabled || loading}>
        Continuar con Google
      </Button>
      {error && (
        <p className="sh-hint sh-hint-warn" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
