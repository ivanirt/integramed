import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const RESET_TTL_MS = 45 * 60 * 1000;
export const RESET_EMAIL_LIMIT = 5;
export const RESET_EMAIL_WINDOW_MS = 15 * 60 * 1000;
export const RESET_IP_LIMIT = 30;
export const RESET_IP_WINDOW_MS = 15 * 60 * 1000;

export const RESET_REQUEST_MESSAGE =
  "Si la cuenta existe, enviamos un enlace para restablecer la contraseña.";

export type ResetRecord = {
  tokenHash: string | null;
  expiresAt: number | null;
};

export type ResetCarrier = {
  resetTokenHash: string | null;
  resetExpiresAt: number | null;
};

export function generateResetToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function issueReset(now = Date.now()): { token: string; record: ResetRecord } {
  const token = generateResetToken();
  return {
    token,
    record: {
      tokenHash: hashResetToken(token),
      expiresAt: now + RESET_TTL_MS,
    },
  };
}

export function verifyResetToken(
  record: ResetRecord,
  token: string,
  now = Date.now(),
): "ok" | "invalid" | "expired" {
  if (!record.tokenHash || record.expiresAt == null || !token) return "invalid";
  const actual = Buffer.from(hashResetToken(token));
  const expected = Buffer.from(record.tokenHash);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return "invalid";
  if (record.expiresAt <= now) return "expired";
  return "ok";
}

export function findResetAccount<T extends ResetCarrier>(
  accounts: T[],
  token: string,
  now = Date.now(),
): { index: number; status: "ok" | "invalid" | "expired" } {
  if (!token) return { index: -1, status: "invalid" };
  const actual = Buffer.from(hashResetToken(token));
  for (let index = 0; index < accounts.length; index += 1) {
    const stored = accounts[index]?.resetTokenHash;
    if (!stored) continue;
    const expected = Buffer.from(stored);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) continue;
    if ((accounts[index].resetExpiresAt ?? 0) <= now) return { index, status: "expired" };
    return { index, status: "ok" };
  }
  return { index: -1, status: "invalid" };
}

export function validateNewPassword(password: string, confirm: string): string | null {
  if (password !== confirm) return "Las contraseñas no coinciden.";
  if (password.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
  if (Buffer.byteLength(password) > 72) return "La contraseña es demasiado larga (máximo 72 bytes).";
  if (!/[A-Za-zÁÉÍÓÚÜáéíóúüÑñ]/.test(password) || !/\d/.test(password)) {
    return "La contraseña debe incluir al menos una letra y un número.";
  }
  return null;
}

export function rateLimitAllow(
  buckets: Map<string, number[]>,
  key: string,
  now: number,
  limit: number,
  windowMs: number,
): boolean {
  const windowStart = now - windowMs;
  const recent = (buckets.get(key) || []).filter((stamp) => stamp > windowStart);
  if (recent.length >= limit) {
    buckets.set(key, recent);
    return false;
  }
  recent.push(now);
  buckets.set(key, recent);
  return true;
}

/** How a login password is checked. Personal hashes replace the shared clinic password. */
export function loginStrategy(
  account: { passwordHash: string | null; passwordRequired: boolean } | null | undefined,
): "hash" | "unset" | "master" {
  if (account?.passwordHash) return "hash";
  if (account?.passwordRequired) return "unset";
  return "master";
}
