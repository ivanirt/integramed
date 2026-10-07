/** Cross-site POST logout is rejected. Browsers send Origin; a missing Origin is not a browser form. */
export function logoutRequestAllowed(request: { headers: { get(name: string): string | null } }): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  if (origin === "null") return false;
  const forwarded = request.headers.get("x-forwarded-host");
  const host = (forwarded ? forwarded.split(",")[0] : request.headers.get("host"))?.trim().toLowerCase();
  if (!host) return false;
  try {
    return new URL(origin).host.toLowerCase() === host;
  } catch {
    return false;
  }
}
