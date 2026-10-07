import { NextResponse } from "next/server";
import { mutateAccounts, readAccounts } from "@/lib/credentials";
import { hashPassword } from "@/lib/passwords";
import { findResetAccount, rateLimitAllow, validateNewPassword } from "@/lib/password-reset";

const ipBuckets = new Map<string, number[]>();
const RESET_POST_LIMIT = 20;
const RESET_POST_WINDOW_MS = 15 * 60 * 1000;

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "local";
  return request.headers.get("x-real-ip") || "local";
}

export async function POST(request: Request) {
  if (!rateLimitAllow(ipBuckets, clientIp(request), Date.now(), RESET_POST_LIMIT, RESET_POST_WINDOW_MS)) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." },
      { status: 429 },
    );
  }

  let body: { token?: unknown; password?: unknown; confirm?: unknown } = {};
  try {
    body = (await request.json()) as { token?: unknown; password?: unknown; confirm?: unknown };
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const token = String(body.token || "");
  const password = String(body.password || "");
  const confirm = String(body.confirm ?? "");
  const problem = validateNewPassword(password, confirm);
  if (!token) {
    return NextResponse.json(
      { error: "El enlace no es válido o ya expiró. Solicita uno nuevo." },
      { status: 400 },
    );
  }
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const preview = findResetAccount(readAccounts(), token, Date.now());
  if (preview.status !== "ok") {
    const error =
      preview.status === "expired"
        ? "El enlace ya expiró. Solicita uno nuevo."
        : "El enlace no es válido o ya expiró. Solicita uno nuevo.";
    return NextResponse.json({ error }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  const changedAt = Date.now();
  const result: { status: "ok" | "invalid" | "expired" } = { status: "invalid" };
  mutateAccounts((accounts) => {
    const found = findResetAccount(accounts, token, Date.now());
    result.status = found.status;
    if (found.status !== "ok" || found.index < 0) return;
    const account = accounts[found.index];
    if (!account) {
      result.status = "invalid";
      return;
    }
    accounts[found.index] = {
      ...account,
      passwordHash,
      passwordRequired: true,
      passwordChangedAt: changedAt,
      mustChangePassword: false,
      resetTokenHash: null,
      resetExpiresAt: null,
    };
  });

  if (result.status !== "ok") {
    const error =
      result.status === "expired"
        ? "El enlace ya expiró. Solicita uno nuevo."
        : "El enlace no es válido o ya expiró. Solicita uno nuevo.";
    return NextResponse.json({ error }, { status: 400 });
  }

  return NextResponse.json({ message: "Contraseña actualizada. Ya puedes entrar." });
}
