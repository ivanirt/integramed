import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAcceptableSecret, verifySessionToken } from "@/lib/session-edge";
import { isPublicPath } from "@/lib/public-path";
import {
  CHANGE_PASSWORD_PATH,
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

function changePasswordPost(pathname: string, method: string) {
  return method === "POST" && pathname === CHANGE_PASSWORD_PATH;
}

/** A rejected POST that never reads the body otherwise surfaces as ECONNRESET. */
async function rejectPasswordChange(request: NextRequest) {
  if (request.method.toUpperCase() === "POST") {
    try {
      await request.arrayBuffer();
    } catch {
      /* the client already closed the body */
    }
  }
  return NextResponse.json({ error: PASSWORD_CHANGE_REQUIRED_ERROR }, { status: 403 });
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
    if (request.headers.has("next-action") && !changePasswordPost(pathname, method)) {
      return rejectPasswordChange(request);
    }
    const access = passwordChangeAccess(pathname, method);
    if (access !== "allow") {
      if (access === "deny" || request.headers.has("next-action")) {
        return rejectPasswordChange(request);
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
