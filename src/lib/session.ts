import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import type { RoleId } from "./roles";
import { isAcceptableSecret, KNOWN_ROLES, SESSION_COOKIE } from "./session-edge";

export type SessionUser = {
  id: string;
  name: string;
  login: string;
  role: RoleId;
};

const COOKIE = SESSION_COOKIE;

function secret(): string {
  const value = (process.env.SESSION_SECRET || "").trim();
  if (!isAcceptableSecret(value)) {
    throw new Error(
      "SESSION_SECRET must be set to a unique value of at least 32 characters. Generate one with: openssl rand -base64 48",
    );
  }
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
  const dot = token.indexOf(".");
  if (dot <= 0 || dot !== token.lastIndexOf(".")) return null;
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionUser & {
      exp: number;
    };
    if (typeof data.exp !== "number" || data.exp < Date.now()) return null;
    if (!data.id || !KNOWN_ROLES.has(data.role)) return null;
    return { id: data.id, name: data.name, login: data.login, role: data.role as RoleId };
  } catch {
    return null;
  }
}
