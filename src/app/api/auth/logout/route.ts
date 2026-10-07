import { NextResponse } from "next/server";
import { logoutRequestAllowed } from "@/lib/request-origin";
import { clearSession } from "@/lib/session";

export async function POST(request: Request) {
  if (!logoutRequestAllowed(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  await clearSession();
  return NextResponse.json({ ok: true });
}
