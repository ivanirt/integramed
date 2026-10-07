import { isAcceptableSecret, KNOWN_ROLES } from "./session-edge";
import { fhirProxyOrigin } from "./proxy";
import type { RoleId } from "./roles";
import { isAuthLookupQuery } from "./auth-query.js";

export type AuthStaff = {
  id: string;
  name: string;
  login: string;
  email: string;
  roles: RoleId[];
  primaryRole: RoleId;
};

/**
 * Looks up one Practitioner for login or password reset.
 * Calls the loopback proxy with the server secret only. It does not send a session
 * cookie and it does not use the session-gated FHIR routes.
 */
function isRole(value: unknown): value is RoleId {
  return typeof value === "string" && KNOWN_ROLES.has(value);
}

/** Session role comes from primaryRole. Reject a payload that cannot name one known assigned role. */
export function acceptAuthStaff(data: Partial<AuthStaff> | null | undefined): AuthStaff | null {
  if (!data?.id || !isRole(data.primaryRole) || !Array.isArray(data.roles)) return null;
  const roles = data.roles.filter(isRole);
  if (!roles.includes(data.primaryRole)) return null;
  return {
    id: String(data.id),
    name: String(data.name || ""),
    login: String(data.login || ""),
    email: String(data.email || ""),
    roles,
    primaryRole: data.primaryRole,
  };
}

export async function lookupStaffForAuth(query: string): Promise<AuthStaff | null> {
  if (!isAuthLookupQuery(query)) return null;
  const secret = (process.env.FHIR_PROXY_SECRET || "").trim();
  if (!isAcceptableSecret(secret)) {
    throw new Error("FHIR_PROXY_SECRET is not configured");
  }
  const url = new URL("/api/internal/staff-lookup", fhirProxyOrigin());
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      "x-integramed-proxy-secret": secret,
    },
    body: JSON.stringify({ q: query }),
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("staff-lookup failed");
  const staff = acceptAuthStaff((await res.json()) as Partial<AuthStaff>);
  if (!staff) throw new Error("staff-lookup failed");
  return staff;
}
