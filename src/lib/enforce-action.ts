import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import {
  authorizeAction,
  denialMessage,
  OWN_RECORD_MESSAGE,
  SELF_OR_ADMIN,
} from "./action-roles.js";
import { getSession, type SessionUser } from "./session";

export async function enforceAction(action: string, options?: { practitionerId?: string }): Promise<SessionUser> {
  const user = await getSession();
  const decision = authorizeAction(action, user?.role ?? null);
  if (decision === "unauthenticated") redirect("/acceso");
  if (decision !== "ok" || !user) redirect(`/?aviso=${encodeURIComponent(denialMessage(action))}`);
  if (options?.practitionerId && SELF_OR_ADMIN.has(action)) {
    if (user.role !== "admin" && user.id !== options.practitionerId) {
      redirect(`/?aviso=${encodeURIComponent(OWN_RECORD_MESSAGE)}`);
    }
  }
  return user;
}

export function enforceRoute(action: string, role: string | null | undefined): NextResponse | null {
  const decision = authorizeAction(action, role ?? null);
  if (decision === "ok") return null;
  const status = decision === "unauthenticated" ? 401 : 403;
  return NextResponse.json({ error: "No autorizado" }, { status });
}
