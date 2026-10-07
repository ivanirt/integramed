const PUBLIC_PREFIXES = ["/acceso", "/api/auth"];

// Paths that answer without a session cookie.
// /healthz is the Docker HEALTHCHECK on the published Next.js port.
// /api/health stays private: it is the authenticated FHIR status probe.
export function isPublicPath(pathname: string): boolean {
  if (pathname === "/healthz") return true;
  return (
    PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)) ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico"
  );
}
