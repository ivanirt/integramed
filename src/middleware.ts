import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAcceptableSecret, verifySessionToken } from "@/lib/session-edge";

const PUBLIC = ["/acceso", "/api/auth"];

function isPublic(pathname: string) {
  return (
    PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  );
}

function wantsJson(pathname: string) {
  return pathname.startsWith("/api/") || pathname === "/fhir" || pathname.startsWith("/fhir/");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const secret = process.env.SESSION_SECRET || "";
  const token = request.cookies.get("integramed_session")?.value;
  const session =
    token && isAcceptableSecret(secret) ? await verifySessionToken(token, secret) : null;
  if (!session) {
    if (wantsJson(pathname)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/acceso";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
