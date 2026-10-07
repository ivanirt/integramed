// Readiness for the published Next.js listener (port 3000).
// Docker HEALTHCHECK: GET http://127.0.0.1:3000/healthz
// No session cookie and no proxy secret. The body is only { ok: true } or { ok: false }.
// Also asks the loopback proxy GET /healthz (FHIR_PROXY_URL) with a 1s timeout.
// The result is reused for a few seconds so a burst of probes does not fan out.
// That probe is not authenticated and does not call the upstream FHIR server.

export const dynamic = "force-dynamic";

const PROXY_TIMEOUT_MS = 1000;
const PROXY_HEALTH_CACHE_MS = 3000;

type ProxyHealthCache = { at: number; ok: boolean };
let proxyHealthCache: ProxyHealthCache | null = null;

export function clearProxyHealthCache(): void {
  proxyHealthCache = null;
}

function proxyHealthUrl(): string | null {
  const raw = process.env.FHIR_PROXY_URL || "http://127.0.0.1:3001";
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const host = url.hostname;
  if (host !== "127.0.0.1" && host !== "localhost" && host !== "[::1]" && host !== "::1") return null;
  return `${url.origin}/healthz`;
}

function healthResponse(ok: boolean) {
  return Response.json({ ok }, { status: ok ? 200 : 503 });
}

export async function GET() {
  const now = Date.now();
  if (proxyHealthCache && now - proxyHealthCache.at < PROXY_HEALTH_CACHE_MS) {
    return healthResponse(proxyHealthCache.ok);
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
  return healthResponse(ok);
}
