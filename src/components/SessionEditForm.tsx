"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { updateSession } from "@/app/(app)/actions";
import type { EditKind, EditPayload } from "@/lib/edit";
import { SessionFields } from "./SessionFields";

type Props = {
  id: string;
  kind: EditKind;
  initial: EditPayload;
  /** Para volver al detalle sin guardar. */
  backHref: string;
};

export function SessionEditForm({ id, kind, initial, backHref }: Props) {
  const router = useRouter();
  const [p, setP] = useState<EditPayload>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const errorRef = useRef<HTMLParagraphElement>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await updateSession(id, p);
      if (!res.ok) {
        setError(res.error);
        requestAnimationFrame(() => errorRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }));
        return;
      }
      router.push(backHref);
      router.refresh();
    });
  }

  return (
    <form className="edit-form" onSubmit={submit} noValidate>
      <SessionFields kind={kind} value={p} onChange={setP} />

      {error && (
        <p ref={errorRef} className="sh-hint sh-hint-warn" role="alert">
          {error}
        </p>
      )}

      <div className="edit-actions">
        <Link href={backHref} className="sh-btn sh-btn-secondary">
          Cancelar
        </Link>
        <button type="submit" className="sh-btn sh-btn-primary" disabled={pending}>
          {pending ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}
