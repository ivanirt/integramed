type HeaderStore = { get(name: string): string | null };

type OriginEnv = {
  NODE_ENV?: string;
  APP_BASE_URL?: string;
};

/**
 * Cross-site POST logout is rejected. Browsers send Origin; a missing Origin is not a browser form.
 * Production compares Origin's scheme and host to APP_BASE_URL and ignores X-Forwarded-Host.
 * Development compares the Origin host to Host.
 */
export function logoutRequestAllowed(
  request: { headers: HeaderStore },
  env: OriginEnv = process.env,
): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  if (origin === "null") return false;
  let originUrl: URL;
  try {
    originUrl = new URL(origin);
  } catch {
    return false;
  }
  if (env.NODE_ENV === "production") {
    const base = String(env.APP_BASE_URL || "").trim();
    let expected: URL;
    try {
      expected = new URL(base);
    } catch {
      return false;
    }
    return (
      originUrl.protocol === expected.protocol && originUrl.host.toLowerCase() === expected.host.toLowerCase()
    );
  }
  const host = request.headers.get("host")?.trim().toLowerCase();
  if (!host) return false;
  return originUrl.host.toLowerCase() === host;
}
