import { NextResponse } from "next/server";
import { searchCie } from "@/lib/cie10";
import { PASSWORD_CHANGE_REQUIRED_ERROR } from "@/lib/password-change-gate";
import { getSession } from "@/lib/session";

// Middleware checks the cookie signature, expiry, role, and mustChange claim.
// getSession() also rejects a cookie issued before the current password and
// re-reads mustChangePassword from accounts.json.
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.mustChangePassword) {
    return NextResponse.json({ error: PASSWORD_CHANGE_REQUIRED_ERROR }, { status: 403 });
  }
  const q = new URL(req.url).searchParams.get("q") || "";
  return NextResponse.json({ items: searchCie(q) });
}
