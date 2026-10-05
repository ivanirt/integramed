import { NextResponse } from "next/server";
import { clearSession, createSession, getSession } from "@/lib/session";
import { lookupStaffForAuth } from "@/lib/staff-lookup";
import { listStaff } from "@/lib/staff";
import type { RoleId } from "@/lib/roles";
import { findAccountForStaff, readAccounts } from "@/lib/credentials";
import { authorizeLogin } from "@/lib/password-reset";
import { verifyPassword } from "@/lib/passwords";

const NO_PASSWORD =
  "Esta cuenta no tiene contraseña personal. Usa «¿Olvidaste tu contraseña?» para definirla.";

export async function GET() {
  return NextResponse.json({ user: await getSession() });
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
  if (!user) {
    return NextResponse.json({ error: "Contraseña incorrecta." }, { status: 401 });
  }

  const account = findAccountForStaff(readAccounts(), user.id, user.email);
  const hashMatches = account?.passwordHash ? await verifyPassword(password, account.passwordHash) : false;
  const decision = authorizeLogin({ account, hashMatches });
  if (!decision.ok) {
    return NextResponse.json(
      { error: decision.reason === "unset" ? NO_PASSWORD : "Contraseña incorrecta." },
      { status: 401 },
    );
  }

  const requested = body.role as RoleId;
  const role = requested && user.roles.includes(requested) ? requested : user.primaryRole;
  const session = { id: user.id, name: user.name, login: user.login, role };
  await createSession(session, { pwdAt: decision.pwdAt });
  return NextResponse.json({ user: session });
}
