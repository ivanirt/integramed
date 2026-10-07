import { createHmac } from "crypto";

export type SessionClaims = {
  id: string;
  name: string;
  login: string;
  role: string;
  pwdAt: number;
  exp: number;
  /** Hint for edge middleware. accounts.json remains the source of truth. */
  mustChange?: boolean;
};

/** Signed cookie payload. `pwdAt` and `mustChange` are kept by the proxy and the edge check. */
export function buildSessionToken(claims: SessionClaims, secret: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      id: claims.id,
      name: claims.name,
      login: claims.login,
      role: claims.role,
      pwdAt: claims.pwdAt,
      mustChange: claims.mustChange === true,
      exp: claims.exp,
    }),
  ).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}
