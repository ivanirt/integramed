import { createHmac } from "crypto";

export type SessionClaims = {
  id: string;
  name: string;
  login: string;
  role: string;
  pwdAt: number;
  exp: number;
};

/** Signed cookie payload. Extra `pwdAt` is ignored by the edge verifier and kept by the proxy. */
export function buildSessionToken(claims: SessionClaims, secret: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      id: claims.id,
      name: claims.name,
      login: claims.login,
      role: claims.role,
      pwdAt: claims.pwdAt,
      exp: claims.exp,
    }),
  ).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}
