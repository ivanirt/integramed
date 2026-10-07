import { cookies } from "next/headers";
import { isAcceptableSecret, SESSION_COOKIE } from "./session-edge";
import { overriddenSession } from "./session";
import { buildSessionToken } from "./session-token";

export function fhirProxyOrigin(): string {
  const raw = process.env.FHIR_PROXY_URL || "http://127.0.0.1:3001";
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("FHIR_PROXY_URL is not a valid URL");
  }
  const host = url.hostname;
  if (host !== "127.0.0.1" && host !== "localhost" && host !== "[::1]" && host !== "::1") {
    throw new Error("FHIR_PROXY_URL must point at the loopback proxy");
  }
  return url.origin;
}

export async function fhirProxyHeaders(extra?: HeadersInit): Promise<Headers> {
  const headers = new Headers(extra);
  const secret = (process.env.FHIR_PROXY_SECRET || "").trim();
  if (!isAcceptableSecret(secret)) {
    throw new Error(
      "FHIR_PROXY_SECRET must be set to a unique value of at least 32 characters. Generate one with: openssl rand -base64 48",
    );
  }
  headers.set("x-integramed-proxy-secret", secret);
  const actor = overriddenSession();
  if (actor) {
    const sessionSecret = (process.env.SESSION_SECRET || "").trim();
    const token = buildSessionToken(
      {
        id: actor.id,
        name: actor.name,
        login: actor.login,
        role: actor.role,
        pwdAt: Date.now(),
        exp: Date.now() + 60_000,
      },
      sessionSecret,
    );
    headers.set("cookie", `${SESSION_COOKIE}=${token}`);
    return headers;
  }
  if (actor === null) return headers;
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) headers.set("cookie", `${SESSION_COOKIE}=${token}`);
  return headers;
}

export async function proxyFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = await fhirProxyHeaders(init.headers);
  return fetch(`${fhirProxyOrigin()}${path}`, { ...init, headers, cache: "no-store" });
}
