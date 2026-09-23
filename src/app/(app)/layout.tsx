import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { TABLES, type Profile } from "@/lib/types";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let { data: profile } = await supabase
    .from(TABLES.profiles)
    .select("id, full_name, role")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (!profile) {
    const fullName =
      (user.user_metadata?.full_name as string | undefined) ?? user.email?.split("@")[0] ?? "ผู้ใช้งาน";
    const { data: created } = await supabase
      .from(TABLES.profiles)
      .insert({ id: user.id, full_name: fullName, role: "staff" })
      .select("id, full_name, role")
      .single<Profile>();
    profile = created ?? { id: user.id, full_name: fullName, role: "staff" };
  }

  return (
    <AppShell profile={profile} email={user.email ?? ""}>
      {children}
    </AppShell>
  );
}
