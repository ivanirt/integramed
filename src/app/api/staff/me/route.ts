import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { listStaff } from "@/lib/staff";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sin sesión" }, { status: 401 });
  const staff = await listStaff();
  const me = staff.find((s) => s.id === session.id);
  return NextResponse.json({ roles: me?.roles || [session.role] });
}
