// Docker HEALTHCHECK command. Runs inside the container as the integramed user.
//
// URL:  http://127.0.0.1:3000/healthz
// Port: 3000 (Next.js, `next start -p 3000`, the port EXPOSE publishes)
//
// Next's /healthz also asks the loopback proxy GET /healthz (FHIR_PROXY_URL,
// 1s, no secret, no upstream FHIR). PORT, if Dokploy sets it, is not this URL.

const url = "http://127.0.0.1:3000/healthz";

try {
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`healthcheck ${url} returned ${res.status}`);
    process.exit(1);
  }
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`healthcheck ${url} failed: ${message}`);
  process.exit(1);
}
