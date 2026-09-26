import { redirect } from "next/navigation";
import { getSession } from "./session";
import { canAccess, type RoleId } from "./roles";
import { loadModules } from "./clinic-config";

export async function requireUser() {
  const user = await getSession();
  if (!user) redirect("/acceso");
  return user;
}

export async function requireScreen(screen: string) {
  const user = await requireUser();
  const { modules } = await loadModules().catch(() => ({ modules: {} as Record<string, boolean> }));
  if (!canAccess(user.role as RoleId, screen, modules)) {
    redirect(`/?aviso=${encodeURIComponent("Esa pantalla no está disponible para tu rol o está apagada en módulos.")}`);
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") {
    redirect(`/?aviso=${encodeURIComponent("Solo administración puede hacer eso.")}`);
  }
  return user;
}

export async function requireSelfOrAdmin(practitionerId: string) {
  const user = await requireUser();
  if (user.role === "admin" || user.id === practitionerId) return user;
  redirect(`/?aviso=${encodeURIComponent("Solo puedes editar tu propia información.")}`);
}
