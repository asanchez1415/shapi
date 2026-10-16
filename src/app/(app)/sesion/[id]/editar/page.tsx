import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { NavIcon } from "@/components/icons";
import { SessionEditForm } from "@/components/SessionEditForm";
import { SportTag } from "@/components/SportTag";
import { formatShort } from "@/lib/dates";
import { editKind, toPayload } from "@/lib/edit";
import { getSessionDetail } from "@/lib/sessions";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const metadata = { title: "Editar sesión · Shapi" };

export default async function EditarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const session = await getSessionDetail(supabase, id);
  if (!session) notFound();
  // Solo se editan sesiones pendientes.
  if (session.status !== "pendiente") redirect(`/sesion/${id}`);

  const structure = (session.structure ?? {}) as Record<string, unknown>;
  const kind = editKind(session.sport, structure);
  const initial = toPayload(session.sport, structure, {
    name: session.name,
    time: session.time,
    notes: session.notes,
  });

  return (
    <div className="detail">
      <Link href={`/sesion/${id}`} className="detail-back">
        <NavIcon name="back" size={20} />
        {session.name}
      </Link>

      <div className="stack" style={{ gap: "var(--espacio-2)", marginTop: "var(--espacio-4)" }}>
        <SportTag sport={session.sport} />
        <h1 className="hd-title">Editar sesión</h1>
        <p className="meta sh-num">
          {formatShort(session.date)} · El día se cambia con «Mover», que llega pronto.
        </p>
      </div>

      <SessionEditForm id={id} kind={kind} initial={initial} backHref={`/sesion/${id}`} />
    </div>
  );
}
