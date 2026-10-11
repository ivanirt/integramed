import { NextResponse } from "next/server";
import { searchCie } from "@/lib/cie10";
import { getSession } from "@/lib/session";

// Middleware only checks the cookie signature, expiry, and role. getSession() also
// rejects a cookie issued before the current password (pwdAt).
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const q = new URL(req.url).searchParams.get("q") || "";
  return NextResponse.json({ items: searchCie(q) });
}
