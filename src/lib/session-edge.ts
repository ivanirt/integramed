export const SESSION_COOKIE = "integramed_session";
export const MIN_SECRET_LENGTH = 32;
export const REJECTED_SECRETS = ["integramed-dev-session-secret"];

export const KNOWN_ROLES = new Set([
  "doctor",
  "therapist",
  "nurse",
  "receptionist",
  "admin",
  "lab",
  "pharmacist",
]);

export type VerifiedSession = {
  id: string;
  name: string;
  login: string;
  role: string;
  exp: number;
  /** Present when the cookie was signed after a temporary password. Missing means false. */
  mustChange: boolean;
};

export function normalizeSecret(value: string | undefined | null): string {
  return String(value || "").trim();
}

export function isAcceptableSecret(value: string | undefined | null): boolean {
  const secret = normalizeSecret(value);
  return secret.length >= MIN_SECRET_LENGTH && !REJECTED_SECRETS.includes(secret);
}

function base64UrlToBytes(input: string): Uint8Array | null {
  try {
    const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
    const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

export async function verifySessionToken(
  token: string,
  secret: string,
): Promise<VerifiedSession | null> {
  const key = normalizeSecret(secret);
  if (!isAcceptableSecret(key) || !token) return null;
  const dot = token.indexOf(".");
  if (dot <= 0 || dot !== token.lastIndexOf(".")) return null;
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const sig = base64UrlToBytes(signature);
  const body = base64UrlToBytes(payload);
  if (!sig || !body) return null;
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const ok = await crypto.subtle.verify(
    "HMAC",
    cryptoKey,
    sig as BufferSource,
    new TextEncoder().encode(payload),
  );
  if (!ok) return null;
  try {
    const data = JSON.parse(new TextDecoder().decode(body)) as VerifiedSession & { mustChange?: unknown };
    if (!data || typeof data.exp !== "number" || data.exp < Date.now()) return null;
    if (!data.id || !KNOWN_ROLES.has(data.role)) return null;
    return {
      id: String(data.id),
      name: String(data.name || ""),
      login: String(data.login || ""),
      role: data.role,
      exp: data.exp,
      mustChange: data.mustChange === true,
    };
  } catch {
    return null;
  }
}
