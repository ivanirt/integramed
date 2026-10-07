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

/**
 * Personal password only. A missing hash never falls back to a shared clinic password,
 * whether or not passwordRequired is set.
 */
export function loginStrategy(
  account: { passwordHash: string | null; passwordRequired?: boolean } | null | undefined,
): "hash" | "unset" {
  if (account?.passwordHash) return "hash";
  return "unset";
}

export function authorizeLogin(input: {
  account: { passwordHash: string | null; passwordRequired?: boolean; passwordChangedAt?: number } | null | undefined;
  hashMatches: boolean;
}): { ok: true; pwdAt: number } | { ok: false; reason: "unset" | "reject" } {
  if (loginStrategy(input.account) !== "hash") return { ok: false, reason: "unset" };
  if (!input.hashMatches) return { ok: false, reason: "reject" };
  return { ok: true, pwdAt: Number(input.account?.passwordChangedAt || 0) };
}

export const LOGIN_ERROR = "Contraseña incorrecta.";

export const SMTP_UNAVAILABLE_LOG =
  "[IntegraMed] SMTP no está configurado. No se generó ningún enlace de restablecimiento. Para asignar una contraseña en el servidor: npm run set-password -- <correo> con SET_PASSWORD en el entorno.";

const RESET_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function redactSecrets(text: string, secrets: string[]): string {
  let out = String(text);
  const sorted = secrets.filter((item) => item && item.length >= 8).sort((a, b) => b.length - a.length);
  for (const secret of sorted) out = out.split(secret).join("[redacted]");
  return out;
}

export type ForgotPasswordUser = { id: string; email: string };

export type ForgotPasswordResult = {
  status: number;
  body: { message?: string; error?: string };
};

/**
 * Asks for a reset link. The HTTP body is the same whether or not the mailbox exists.
 * Without a way to deliver the link, no token is created and nothing about the link is logged.
 */
export async function processForgotPassword(options: {
  mode: "smtp" | "dev-log" | "unavailable";
  lookup: () => Promise<ForgotPasswordUser | null>;
  issue: () => { token: string; record: ResetRecord };
  save: (user: ForgotPasswordUser, record: ResetRecord) => void;
  deliver: (to: string, link: string) => Promise<void>;
  linkFor: (token: string) => string;
  log: (line: string) => void;
  unavailableLog?: string;
}): Promise<ForgotPasswordResult> {
  if (options.mode === "unavailable") {
    options.log(options.unavailableLog || SMTP_UNAVAILABLE_LOG);
    return { status: 200, body: { message: RESET_REQUEST_MESSAGE } };
  }

  let user: ForgotPasswordUser | null = null;
  try {
    user = await options.lookup();
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    options.log(`[IntegraMed] No se pudo consultar el personal para restablecer la contraseña: ${detail}`);
    return {
      status: 503,
      body: { error: "No se pudo procesar la solicitud. Inténtalo más tarde." },
    };
  }

  const destination = user?.email?.trim().toLowerCase() || "";
  if (!user || !RESET_EMAIL.test(destination)) {
    return { status: 200, body: { message: RESET_REQUEST_MESSAGE } };
  }

  const issued = options.issue();
  options.save({ id: user.id, email: destination }, issued.record);
  const link = options.linkFor(issued.token);
  try {
    await options.deliver(destination, link);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    options.log(redactSecrets(`[IntegraMed] No se pudo enviar el correo de restablecimiento: ${detail}`, [issued.token, link]));
  }
  return { status: 200, body: { message: RESET_REQUEST_MESSAGE } };
}
