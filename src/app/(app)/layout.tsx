import { redirect } from "next/navigation";
import { Account } from "@/components/Account";
import { SideNav, TabBar } from "@/components/AppNav";
import { ActionsProvider } from "@/components/SessionActions";
import { todayISO } from "@/lib/dates";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { firstName } from "@/lib/user";

// Depende de la sesión de cada persona: nunca se genera de forma estática.
export const dynamic = "force-dynamic";

// Marco de la app: menú lateral en notebook, barra inferior en celular.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!hasSupabaseEnv) redirect("/login");

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  return (
    <ActionsProvider today={todayISO()}>
    <div className="app">
      <aside className="app-side">
        <SideNav footer={<Account name={firstName(data.user)} />} />
      </aside>
      <main className="app-main">{children}</main>
      <div className="app-tabs">
        <TabBar />
      </div>
    </div>
    </ActionsProvider>
  );
}
