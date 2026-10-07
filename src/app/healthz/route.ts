// Liveness for the published Next.js listener (port 3000).
// Docker HEALTHCHECK: GET http://127.0.0.1:3000/healthz
// No session cookie and no proxy secret. This does not call FHIR.

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ ok: true });
}
