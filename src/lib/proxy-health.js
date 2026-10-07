// Loopback proxy probe for Next's /healthz. Cached for a few seconds so a
// burst of Docker HEALTHCHECKs does not fan out. No cookie, no secret, and
// the proxy body is not returned.

const PROXY_TIMEOUT_MS = 1000;
const PROXY_HEALTH_CACHE_MS = 3000;

/** @type {{ at: number, ok: boolean } | null} */
let proxyHealthCache = null;

export function clearProxyHealthCache() {
  proxyHealthCache = null;
}

function proxyHealthUrl() {
  const raw = process.env.FHIR_PROXY_URL || "http://127.0.0.1:3001";
  let url;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const host = url.hostname;
  if (host !== "127.0.0.1" && host !== "localhost" && host !== "[::1]" && host !== "::1") return null;
  return `${url.origin}/healthz`;
}

/** @returns {Promise<boolean>} */
export async function readProxyHealth() {
  const now = Date.now();
  if (proxyHealthCache && now - proxyHealthCache.at < PROXY_HEALTH_CACHE_MS) {
    return proxyHealthCache.ok;
  }
  const target = proxyHealthUrl();
  let ok = false;
  if (target) {
    try {
      const res = await fetch(target, {
        cache: "no-store",
        signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
      });
      ok = res.ok;
    } catch {
      ok = false;
    }
  }
  proxyHealthCache = { at: Date.now(), ok };
  return ok;
}
