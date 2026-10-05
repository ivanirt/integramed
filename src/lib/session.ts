import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import type { RoleId } from "./roles";

export type SessionUser = {
  id: string;
  name: string;
  login: string;
  role: RoleId;
};

const COOKIE = "integramed_session";

function secret(): string {
  const value = process.env.SESSION_SECRET || "integramed-dev-session-secret";
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export async function createSession(user: SessionUser): Promise<void> {
  const payload = Buffer.from(
    JSON.stringify({ ...user, exp: Date.now() + 1000 * 60 * 60 * 24 * 14 }),
  ).toString("base64url");
  const token = `${payload}.${sign(payload)}`;
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionUser & {
      exp: number;
    };
    if (data.exp < Date.now()) return null;
    return { id: data.id, name: data.name, login: data.login, role: data.role };
  } catch {
    return null;
  }
}
