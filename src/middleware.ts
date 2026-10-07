import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAcceptableSecret, verifySessionToken } from "@/lib/session-edge";
import { isPublicPath } from "@/lib/public-path";
import {
  PASSWORD_CHANGE_REQUIRED_ERROR,
  passwordChangeAccess,
} from "@/lib/password-change-gate";

// The edge check verifies the signature, expiry, role, and the mustChange claim.
// It does not read accounts.json. getSession(), server actions, API routes, and
// the FHIR proxy re-read the file, so a cookie that omits the claim cannot bypass it.
// /healthz stays public: the Docker probe has no cookie and no clinical body.

function wantsJson(pathname: string) {
  return pathname.startsWith("/api/") || pathname === "/fhir" || pathname.startsWith("/fhir/");
}

function denied(pathname: string) {
  if (wantsJson(pathname)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method.toUpperCase();
  const secret = process.env.SESSION_SECRET || "";
  const token = request.cookies.get("integramed_session")?.value;
  const session =
    token && isAcceptableSecret(secret) ? await verifySessionToken(token, secret) : null;

  if (!session) {
    if (isPublicPath(pathname)) return NextResponse.next();
    if (pathname === "/api/auth/logout" && method === "POST") return NextResponse.next();
    const blocked = denied(pathname);
    if (blocked) return blocked;
    const url = request.nextUrl.clone();
    url.pathname = "/acceso";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (session.mustChange) {
    const access = passwordChangeAccess(pathname, method);
    if (access !== "allow") {
      if (access === "deny" || request.headers.has("next-action")) {
        return NextResponse.json({ error: PASSWORD_CHANGE_REQUIRED_ERROR }, { status: 403 });
      }
      const url = request.nextUrl.clone();
      url.pathname = "/cuenta/contrasena";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
