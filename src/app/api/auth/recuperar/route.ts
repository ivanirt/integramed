import { NextResponse } from "next/server";
import { blankAccount, mutateAccounts } from "@/lib/credentials";
import { listStaff, type StaffMember } from "@/lib/staff";
import { resetLink, sendPasswordResetEmail } from "@/lib/mailer";
import {
  RESET_EMAIL_LIMIT,
  RESET_EMAIL_WINDOW_MS,
  RESET_IP_LIMIT,
  RESET_IP_WINDOW_MS,
  RESET_REQUEST_MESSAGE,
  issueReset,
  rateLimitAllow,
} from "@/lib/password-reset";

const emailBuckets = new Map<string, number[]>();
const ipBuckets = new Map<string, number[]>();

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "local";
  return request.headers.get("x-real-ip") || "local";
}

function findStaff(staff: StaffMember[], email: string): StaffMember | undefined {
  return staff.find((member) => member.email.toLowerCase() === email || member.login.toLowerCase() === email);
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

  let staff: StaffMember[] = [];
  try {
    staff = await listStaff();
  } catch (err) {
    console.error("[IntegraMed] No se pudo consultar el personal para restablecer la contraseña:", err);
    return NextResponse.json(
      { error: "No se pudo procesar la solicitud. Inténtalo más tarde." },
      { status: 503 },
    );
  }

  const user = findStaff(staff, email);
  const destination = user?.email?.trim().toLowerCase() || "";
  if (user && EMAIL.test(destination)) {
    const issued = issueReset(now);
    mutateAccounts((accounts) => {
      let account = accounts.find((item) => item.practitionerId === user.id);
      if (!account) {
        account = blankAccount(user.id, destination, false);
        accounts.push(account);
      }
      account.email = destination;
      account.resetTokenHash = issued.record.tokenHash;
      account.resetExpiresAt = issued.record.expiresAt;
    });
    await sendPasswordResetEmail(destination, resetLink(issued.token));
  }

  return NextResponse.json({ message: RESET_REQUEST_MESSAGE });
}
