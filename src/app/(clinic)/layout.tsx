import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ClinicShell } from "@/components/ClinicShell";
import { getSession } from "@/lib/session";
import { canAccess } from "@/lib/roles";
import { loadAccessModules } from "@/lib/clinic-config";
import { ROLE_SCREENS } from "@/lib/roles";

export default async function LoggedLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/acceso");
  const modules = await loadAccessModules().catch(() => ({}) as Record<string, boolean>);
  const screens = (ROLE_SCREENS[user.role] || []).filter((screen) => canAccess(user.role, screen, modules));
  const collapsed = (await cookies()).get("integramed_sidebar_collapsed")?.value === "true";
  return (
    <ClinicShell user={user} screens={screens} initialCollapsed={collapsed}>
      {children}
    </ClinicShell>
  );
}
