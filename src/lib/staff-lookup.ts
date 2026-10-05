import { isAcceptableSecret } from "./session-edge";
import { fhirProxyOrigin } from "./proxy";
import type { RoleId } from "./roles";

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
export async function lookupStaffForAuth(query: string): Promise<AuthStaff | null> {
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
  const data = (await res.json()) as Partial<AuthStaff>;
  if (!data?.id || !data.primaryRole || !Array.isArray(data.roles)) {
    throw new Error("staff-lookup failed");
  }
  return {
    id: String(data.id),
    name: String(data.name || ""),
    login: String(data.login || ""),
    email: String(data.email || ""),
    roles: data.roles,
    primaryRole: data.primaryRole,
  };
}
