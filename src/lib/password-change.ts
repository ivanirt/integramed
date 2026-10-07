import type { CredentialAccount } from "./credentials.ts";
import { verifyPassword, DUMMY_PASSWORD_HASH, hashPassword } from "./passwords.ts";
import { rateLimitAllow, validateNewPassword } from "./password-reset.ts";
import { CHANGE_PASSWORD_ACTION_ID } from "./password-change-gate.ts";

export { CHANGE_PASSWORD_ACTION_ID };

export const CHANGE_PASSWORD_LIMIT = 10;
export const CHANGE_PASSWORD_WINDOW_MS = 15 * 60 * 1000;
export const CHANGE_PASSWORD_IP_LIMIT = 30;

export const SAME_PASSWORD_ERROR = "La nueva contraseña tiene que ser distinta de la actual.";
export const WRONG_PASSWORD_ERROR = "La contraseña actual no es correcta.";
export const CHANGE_PASSWORD_RATE_ERROR = "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";

const userBuckets = new Map<string, number[]>();
const ipBuckets = new Map<string, number[]>();

export function resetPasswordChangeLimits(): void {
  userBuckets.clear();
  ipBuckets.clear();
}

/** Dokploy/Traefik should set TRUST_PROXY=1. Otherwise client-supplied forwarding headers are ignored. */
export function trustProxyHeaders(env: NodeJS.ProcessEnv = process.env): boolean {
  return String(env.TRUST_PROXY || "").trim() === "1";
}

/**
 * IP key for the change-password limiter.
 * With TRUST_PROXY, Traefik's X-Real-IP wins, otherwise the last X-Forwarded-For hop.
 * Without it, those headers are ignored. A missing socket address returns null so the
 * caller keeps only the per-user limit and does not share one bucket across everyone.
 */
export function passwordChangeClientAddress(
  header: (name: string) => string | null,
  options?: { trustProxy?: boolean; remoteAddress?: string | null },
): string | null {
  const trust = options?.trustProxy ?? trustProxyHeaders();
  if (trust) {
    const real = header("x-real-ip")?.trim();
    if (real) return real;
    const forwarded = header("x-forwarded-for");
    if (forwarded) {
      const hops = forwarded.split(",").map((part) => part.trim()).filter(Boolean);
      if (hops.length) return hops[hops.length - 1];
    }
  }
  const remote = options?.remoteAddress?.trim();
  return remote || null;
}

export function allowPasswordChangeAttempt(userId: string, ip: string | null, now = Date.now()): boolean {
  const userOk = rateLimitAllow(userBuckets, `user:${userId}`, now, CHANGE_PASSWORD_LIMIT, CHANGE_PASSWORD_WINDOW_MS);
  if (!ip) return userOk;
  const ipOk = rateLimitAllow(ipBuckets, `ip:${ip}`, now, CHANGE_PASSWORD_IP_LIMIT, CHANGE_PASSWORD_WINDOW_MS);
  return userOk && ipOk;
}

export async function evaluatePasswordChange(input: {
  account: { passwordHash: string | null } | null | undefined;
  currentPassword: string;
  nextPassword: string;
  confirm: string;
}): Promise<{ ok: true; passwordHash: string } | { ok: false; error: string }> {
  const problem = validateNewPassword(input.nextPassword, input.confirm);
  if (problem) return { ok: false, error: problem };
  if (input.nextPassword === input.currentPassword) return { ok: false, error: SAME_PASSWORD_ERROR };

  const hash = input.account?.passwordHash || "";
  const currentOk = hash ? await verifyPassword(input.currentPassword, hash) : false;
  if (!hash) await verifyPassword(input.currentPassword, DUMMY_PASSWORD_HASH);
  if (!currentOk) return { ok: false, error: WRONG_PASSWORD_ERROR };

  if (await verifyPassword(input.nextPassword, hash)) return { ok: false, error: SAME_PASSWORD_ERROR };
  return { ok: true, passwordHash: await hashPassword(input.nextPassword) };
}

/**
 * Clears the temporary-password flag and rotates `passwordChangedAt`.
 * Returns false when the account disappeared or the password changed under us.
 */
export function commitPasswordChange(
  accounts: CredentialAccount[],
  practitionerId: string,
  passwordHash: string,
  changedAt: number,
  expectedChangedAt: number,
): boolean {
  const index = accounts.findIndex((account) => account.practitionerId === practitionerId);
  const account = index >= 0 ? accounts[index] : undefined;
  if (!account || account.passwordChangedAt !== expectedChangedAt) return false;
  accounts[index] = {
    ...account,
    passwordHash,
    passwordRequired: true,
    passwordChangedAt: changedAt,
    mustChangePassword: false,
    resetTokenHash: null,
    resetExpiresAt: null,
  };
  return true;
}
