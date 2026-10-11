import { NextResponse } from "next/server";
import { mutateAccounts, pinnedAccountEmail, readAccounts, storeResetOnPinnedAccount } from "@/lib/credentials";
import { resetDeliveryMode, resetLink, resetUnavailableLog, sendPasswordResetEmail } from "@/lib/mailer";
import {
  issueReset,
  processForgotPassword,
  rateLimitAllow,
  RESET_EMAIL_LIMIT,
  RESET_EMAIL_WINDOW_MS,
  RESET_IP_LIMIT,
  RESET_IP_WINDOW_MS,
} from "@/lib/password-reset";
import { lookupStaffForAuth } from "@/lib/staff-lookup";

const emailBuckets = new Map<string, number[]>();
const ipBuckets = new Map<string, number[]>();

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "local";
  return request.headers.get("x-real-ip") || "local";
}

export async function POST(request: Request) {
  let body: { email?: unknown } = {};
  try {
    body = (await request.json()) as { email?: unknown };
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const email = String(body.email || "").trim().toLowerCase();
  if (!EMAIL.test(email)) {
    return NextResponse.json({ error: "Escribe un correo electrónico válido." }, { status: 400 });
  }

  const now = Date.now();
  if (!rateLimitAllow(emailBuckets, email, now, RESET_EMAIL_LIMIT, RESET_EMAIL_WINDOW_MS)) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." },
      { status: 429 },
    );
  }
  if (!rateLimitAllow(ipBuckets, clientIp(request), now, RESET_IP_LIMIT, RESET_IP_WINDOW_MS)) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." },
      { status: 429 },
    );
  }

  const result = await processForgotPassword({
    mode: resetDeliveryMode(),
    unavailableLog: resetUnavailableLog(),
    lookup: async () => {
      const user = await lookupStaffForAuth(email);
      if (!user) return null;
      const destination = pinnedAccountEmail(readAccounts(), user.id);
      if (!destination) return null;
      return { id: user.id, email: destination };
    },
    issue: () => issueReset(now),
    save: (user, record) => {
      mutateAccounts((accounts) => {
        storeResetOnPinnedAccount(accounts, user.id, record);
      });
    },
    deliver: async (to, link) => {
      await sendPasswordResetEmail(to, link);
    },
    linkFor: (token) => resetLink(token),
    log: (line) => console.error(line),
  });

  return NextResponse.json(result.body, { status: result.status });
}
