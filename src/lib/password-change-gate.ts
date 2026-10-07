/**
 * Stable id for a future action-to-roles map.
 * The server action export is `changePasswordAction`.
 */
export const CHANGE_PASSWORD_ACTION_ID = "changePassword";

export const CHANGE_PASSWORD_PATH = "/cuenta/contrasena";
export const LOGOUT_PATH = "/api/auth/logout";
export const PASSWORD_CHANGE_REQUIRED_ERROR = "Debes cambiar tu contraseña.";

const STATIC_FILE = /\.(?:css|js|map|png|jpe?g|gif|svg|ico|webp|txt|woff2?)$/i;

export function isAnonymousPath(pathname: string): boolean {
  return (
    pathname === "/acceso" ||
    pathname.startsWith("/acceso/") ||
    pathname === "/api/auth/recuperar" ||
    pathname.startsWith("/api/auth/recuperar/") ||
    pathname === "/api/auth/restablecer" ||
    pathname.startsWith("/api/auth/restablecer/") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  );
}

/**
 * What a session that still must change its password is allowed to reach.
 * Anything else is denied (API, proxy, server actions) or redirected (pages).
 */
export function passwordChangeAccess(pathname: string, method: string): "allow" | "redirect" | "deny" {
  const verb = method.toUpperCase();
  if (pathname === "/healthz" || isAnonymousPath(pathname) || STATIC_FILE.test(pathname)) return "allow";
  if (pathname === CHANGE_PASSWORD_PATH || pathname.startsWith(`${CHANGE_PASSWORD_PATH}/`)) return "allow";
  if (pathname === LOGOUT_PATH && verb === "POST") return "allow";
  if (pathname.startsWith("/api/") || pathname === "/fhir" || pathname.startsWith("/fhir/")) return "deny";
  return "redirect";
}
