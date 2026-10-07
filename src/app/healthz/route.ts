// Readiness for the published Next.js listener (port 3000).
// Docker HEALTHCHECK: GET http://127.0.0.1:3000/healthz
// No session cookie and no proxy secret. The body is only { ok: true } or { ok: false }.
// Also asks the loopback proxy GET /healthz (FHIR_PROXY_URL) with a 1s timeout.
// That probe is not authenticated and does not call the upstream FHIR server.

export const dynamic = "force-dynamic";

const PROXY_TIMEOUT_MS = 1000;

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

export async function GET() {
  const target = proxyHealthUrl();
  if (!target) return Response.json({ ok: false }, { status: 503 });
  try {
    const res = await fetch(target, {
      cache: "no-store",
      signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
    });
    if (!res.ok) return Response.json({ ok: false }, { status: 503 });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
