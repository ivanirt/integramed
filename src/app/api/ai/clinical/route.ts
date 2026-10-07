import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { proxyFetch } from "@/lib/proxy";
import { enforceRoute } from "@/lib/enforce-action";

export async function POST(req: Request) {
  const user = await getSession();
  const denied = enforceRoute("clinicalAi", user?.role ?? null);
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const res = await proxyFetch("/api/ai/consult", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-ui-language": "es",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({ error: "Respuesta inválida de IA" }));
  return NextResponse.json(data, { status: res.status });
}
