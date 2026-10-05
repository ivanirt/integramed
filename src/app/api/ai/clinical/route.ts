import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function POST(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No hay sesión" }, { status: 401 });

  const apiKey = (process.env.CLINICAL_AI_KEY || process.env.OPENROUTER_API_KEY || "").trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Configura CLINICAL_AI_KEY en el entorno del servidor." },
      { status: 400 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const proxy = process.env.FHIR_PROXY_URL || "http://localhost:3001";
  const res = await fetch(`${proxy}/api/ai/consult`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-ai-key": apiKey,
      "x-ai-base-url": process.env.CLINICAL_AI_BASE || "https://openrouter.ai/api/v1",
      "x-ai-model": process.env.CLINICAL_AI_MODEL || "openai/gpt-4o",
      "x-ui-language": "es",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({ error: "Respuesta inválida de IA" }));
  return NextResponse.json(data, { status: res.status });
}
