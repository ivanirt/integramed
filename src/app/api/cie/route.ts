import { NextResponse } from "next/server";
import { searchCie } from "@/lib/cie10";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") || "";
  return NextResponse.json({ items: searchCie(q) });
}
