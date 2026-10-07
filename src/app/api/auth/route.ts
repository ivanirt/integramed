import { NextResponse } from "next/server";
import { clearSession, createSession, getSession } from "@/lib/session";
import { lookupStaffForAuth } from "@/lib/staff-lookup";
import { listStaff } from "@/lib/staff";
import type { RoleId } from "@/lib/roles";
import { findAccountForStaff, readAccounts } from "@/lib/credentials";
import { LOGIN_ERROR } from "@/lib/password-reset";
import { PASSWORD_CHANGE_REQUIRED_ERROR } from "@/lib/password-change-gate";
import { checkLoginPassword } from "@/lib/passwords";
import { logMissingPractitionerOnLogin } from "@/lib/missing-practitioner.js";

export async function GET() {
  const user = await getSession();
  if (user?.mustChangePassword) {
    return NextResponse.json({ error: PASSWORD_CHANGE_REQUIRED_ERROR }, { status: 403 });
  }
  return NextResponse.json({ user });
}

export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const action = String(body.action || "");

  if (action === "logout") {
    await clearSession();
    return NextResponse.json({ ok: true });
  }

  if (action === "switch-role") {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Sin sesión" }, { status: 401 });
    if (session.mustChangePassword) {
      return NextResponse.json({ error: PASSWORD_CHANGE_REQUIRED_ERROR }, { status: 403 });
    }
    const role = body.role as RoleId;
    const staff = await listStaff();
    const me = staff.find((s) => s.id === session.id);
    if (!me?.roles.includes(role)) {
      return NextResponse.json({ error: "Ese rol no está asignado." }, { status: 403 });
    }
    await createSession({ ...session, role });
    return NextResponse.json({ user: { ...session, role } });
  }

  const login = String(body.login || body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!login || !password) {
    return NextResponse.json({ error: "Usuario y contraseña son necesarios." }, { status: 400 });
  }

  let user;
  try {
    user = await lookupStaffForAuth(login);
  } catch (err) {
    console.error("lookupStaffForAuth", err instanceof Error ? err.message : "failed");
    return NextResponse.json(
      { error: "No se pudo consultar el personal. Inténtalo más tarde." },
      { status: 503 },
    );
  }
  const accounts = readAccounts();
  const account = user ? findAccountForStaff(accounts, user.id, user.email) : undefined;
  const decision = await checkLoginPassword(password, account);
  if (!decision.ok || !user) {
    if (!user) logMissingPractitionerOnLogin(login, accounts);
    return NextResponse.json({ error: LOGIN_ERROR }, { status: 401 });
  }

  const requested = body.role as RoleId;
  const role = requested && user.roles.includes(requested) ? requested : user.primaryRole;
  const session = { id: user.id, name: user.name, login: user.login, role };
  const mustChangePassword = account?.mustChangePassword === true;
  await createSession(session, { pwdAt: decision.pwdAt, mustChange: mustChangePassword });
  return NextResponse.json({ user: { ...session, mustChangePassword } });
}
