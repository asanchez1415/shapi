import { notFound } from "next/navigation";
import { SessionDetailView } from "@/components/SessionDetailView";
import { getSessionDetail } from "@/lib/sessions";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function SesionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const session = await getSessionDetail(supabase, id);
  if (!session) notFound();

  return <SessionDetailView session={session} />;
}
