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
  if (SELF_OR_ADMIN.has(action)) {
    if (!user.id) redirect(`/?aviso=${encodeURIComponent(OWN_RECORD_MESSAGE)}`);
    if (user.role === "admin" && options && !String(options.practitionerId || "").trim()) {
      redirect(`/?aviso=${encodeURIComponent(OWN_RECORD_MESSAGE)}`);
    }
  }
  return user;
}

/** Non-admins always edit their own record. A form id is not an authorization input. */
export function sessionPractitionerId(user: SessionUser, requested?: string): string {
  if (user.role === "admin") {
    const id = String(requested || "").trim();
    if (!id) redirect(`/?aviso=${encodeURIComponent(OWN_RECORD_MESSAGE)}`);
    return id;
  }
  if (!user.id) redirect(`/?aviso=${encodeURIComponent(OWN_RECORD_MESSAGE)}`);
  return user.id;
}

export function enforceRoute(action: string, role: string | null | undefined): NextResponse | null {
  const decision = authorizeAction(action, role ?? null);
  if (decision === "ok") return null;
  const status = decision === "unauthenticated" ? 401 : 403;
  return NextResponse.json({ error: "No autorizado" }, { status });
}
