import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import type { RoleId } from "./roles";
import { readAccountsResult } from "./credentials";
import { passwordChangeRequired } from "./must-change.js";
import { isAcceptableSecret, KNOWN_ROLES, SESSION_COOKIE } from "./session-edge";
import { isSessionPasswordCurrent } from "./session-stamp.js";
import { buildSessionToken } from "./session-token";

export type SessionUser = {
  id: string;
  name: string;
  login: string;
  role: RoleId;
};

export type ActiveSession = SessionUser & {
  /** From accounts.json, not from the cookie. Missing flag means false. */
  mustChangePassword: boolean;
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

type TokenBody = SessionUser & { exp: number; pwdAt?: number; mustChange?: boolean };

function readToken(token: string | undefined): TokenBody | null {
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
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as TokenBody;
    if (typeof data.exp !== "number" || data.exp < Date.now()) return null;
    if (!data.id || !KNOWN_ROLES.has(data.role)) return null;
    return data;
  } catch {
    return null;
  }
}

async function currentPwdAt(): Promise<number> {
  const store = await cookies();
  return readToken(store.get(COOKIE)?.value)?.pwdAt || 0;
}

function mustChangeFromFile(userId: string, explicit?: boolean): boolean {
  const loaded = readAccountsResult();
  if (!loaded.ok) return true;
  const fromFile = passwordChangeRequired({ id: userId }, loaded.accounts, true);
  return fromFile || explicit === true;
}

export async function createSession(
  user: SessionUser,
  options?: { pwdAt?: number; mustChange?: boolean },
): Promise<void> {
  const pwdAt = options && typeof options.pwdAt === "number" ? options.pwdAt : await currentPwdAt();
  const mustChange = mustChangeFromFile(user.id, options?.mustChange);
  const token = buildSessionToken(
    {
      id: user.id,
      name: user.name,
      login: user.login,
      role: user.role,
      pwdAt,
      mustChange,
      exp: Date.now() + 1000 * 60 * 60 * 24 * 14,
    },
    secret(),
  );
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

export async function getSession(): Promise<ActiveSession | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  const data = readToken(token);
  if (!data?.id || !KNOWN_ROLES.has(data.role)) return null;
  const loaded = readAccountsResult();
  if (!loaded.ok) return null;
  if (!isSessionPasswordCurrent({ id: data.id, pwdAt: data.pwdAt }, loaded.accounts)) return null;
  const mustChangePassword = passwordChangeRequired({ id: data.id }, loaded.accounts, true);
  return {
    id: data.id,
    name: data.name,
    login: data.login,
    role: data.role as RoleId,
    mustChangePassword,
  };
}
