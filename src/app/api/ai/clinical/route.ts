import { NextResponse } from "next/server";
import { PASSWORD_CHANGE_REQUIRED_ERROR } from "@/lib/password-change-gate";
import { getSession } from "@/lib/session";
import { proxyFetch } from "@/lib/proxy";

export async function POST(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No hay sesión" }, { status: 401 });
  if (user.mustChangePassword) {
    return NextResponse.json({ error: PASSWORD_CHANGE_REQUIRED_ERROR }, { status: 403 });
  }

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
