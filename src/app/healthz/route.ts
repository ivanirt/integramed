// Readiness for the published Next.js listener (port 3000).
// Docker HEALTHCHECK: GET http://127.0.0.1:3000/healthz
// No session cookie and no proxy secret. The body is only { ok: true } or { ok: false }.
// Also asks the loopback proxy GET /healthz (FHIR_PROXY_URL) with a 1s timeout.
// The result is reused for 3 seconds so a burst of probes does not fan out.
// That probe is not authenticated and does not call the upstream FHIR server.

import { readProxyHealth } from "../../lib/proxy-health.js";

export const dynamic = "force-dynamic";

export async function GET() {
  const ok = await readProxyHealth();
  return Response.json({ ok }, { status: ok ? 200 : 503 });
}
