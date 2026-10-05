import { NextResponse } from "next/server";
import { clearSession, createSession, getSession } from "@/lib/session";
import { ensureBootstrapStaff, listStaff } from "@/lib/staff";
import type { RoleId } from "@/lib/roles";
import { findAccountForStaff, readAccounts } from "@/lib/credentials";
import { loginStrategy } from "@/lib/password-reset";
import { verifyPassword } from "@/lib/passwords";

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

  let staff: Awaited<ReturnType<typeof listStaff>> = [];
  try {
    staff = await listStaff();
  } catch (err) {
    console.error("listStaff", err);
  }
  let user = staff.find((s) => s.login.toLowerCase() === login || s.email.toLowerCase() === login);
  if (!user && (login === "ivan" || login === "ivan_renteria@integramed.com")) {
    try {
      staff = await ensureBootstrapStaff();
      user = staff.find((s) => s.login.toLowerCase() === login || s.email.toLowerCase() === login);
    } catch (err) {
      console.error("ensureBootstrapStaff", err);
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "No se pudo crear el Practitioner." },
        { status: 502 },
      );
    }
  }
  const master = process.env.CLINIC_MASTER_PASSWORD || "IntegraMed27";
  if (!user) {
    if (password !== master) {
      return NextResponse.json({ error: "Contraseña incorrecta." }, { status: 401 });
    }
    return NextResponse.json({ error: "No hay un Practitioner con ese acceso." }, { status: 404 });
  }

  const account = findAccountForStaff(readAccounts(), user.id, user.email);
  const strategy = loginStrategy(account);
  if (strategy === "unset") {
    return NextResponse.json(
      { error: "Esta cuenta no tiene contraseña. Usa «¿Olvidaste tu contraseña?» para definirla." },
      { status: 401 },
    );
  }
  if (strategy === "hash") {
    const matches = await verifyPassword(password, account?.passwordHash || "");
    if (!matches) {
      return NextResponse.json({ error: "Contraseña incorrecta." }, { status: 401 });
    }
  } else if (password !== master) {
    return NextResponse.json({ error: "Contraseña incorrecta." }, { status: 401 });
  }

  const requested = body.role as RoleId;
  const role = requested && user.roles.includes(requested) ? requested : user.primaryRole;
  const session = { id: user.id, name: user.name, login: user.login, role };
  await createSession(session, { pwdAt: account?.passwordChangedAt || 0 });
  return NextResponse.json({ user: session });
}
