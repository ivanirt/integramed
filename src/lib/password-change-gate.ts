/**
 * Stable id for a future action-to-roles map.
 * The server action export is `changePasswordAction`.
 */
export const CHANGE_PASSWORD_ACTION_ID = "changePassword";

export const CHANGE_PASSWORD_PATH = "/cuenta/contrasena";
export const LOGOUT_PATH = "/api/auth/logout";
export const PASSWORD_CHANGE_REQUIRED_ERROR = "Debes cambiar tu contraseña.";

const ANONYMOUS_PATHS = new Set([
  "/acceso",
  "/acceso/recuperar",
  "/acceso/restablecer",
  "/api/auth/recuperar",
  "/api/auth/restablecer",
  "/favicon.ico",
]);

export function isAnonymousPath(pathname: string): boolean {
  return ANONYMOUS_PATHS.has(pathname) || pathname.startsWith("/_next/");
}

/**
 * What a session that still must change its password is allowed to reach.
 * Anything else is denied (API, proxy, server actions) or redirected (pages).
 * There is no extension allowlist: /api/cie.js and /fhir/Patient/1.txt stay denied.
 */
export function passwordChangeAccess(pathname: string, method: string): "allow" | "redirect" | "deny" {
  const verb = method.toUpperCase();
  if (pathname === "/healthz" || isAnonymousPath(pathname)) return "allow";
  if (pathname === CHANGE_PASSWORD_PATH) return "allow";
  if (pathname === LOGOUT_PATH && verb === "POST") return "allow";
  if (pathname.startsWith("/api/") || pathname === "/fhir" || pathname.startsWith("/fhir/")) return "deny";
  return "redirect";
}
