import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ADMIN_ONLY_MESSAGE, authorizePage } from "@/lib/action-roles.js";
import { isAcceptableSecret, verifySessionToken } from "@/lib/session-edge";
import { isPublicPath } from "@/lib/public-path";

// This edge check verifies the signature, expiry, and a known role.
// It does not read accounts.json, so it cannot reject a cookie issued before
// the current password. Sensitive route handlers (for example /api/cie) must
// call getSession(), which includes that pwdAt check.

function wantsJson(pathname: string) {
  return pathname.startsWith("/api/") || pathname === "/fhir" || pathname.startsWith("/fhir/");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

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
  if (authorizePage(pathname, session.role) === "forbidden") {
    if (wantsJson(pathname)) {
      return NextResponse.json({ error: ADMIN_ONLY_MESSAGE }, { status: 403 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    url.searchParams.set("aviso", ADMIN_ONLY_MESSAGE);
    const response = NextResponse.redirect(url);
    response.headers.set("cache-control", "no-store");
    return response;
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
