import nodemailer from "nodemailer";

export const RESET_LINK_LOG_FLAG = "PASSWORD_RESET_LOG_LINK";
const SMTP_UNAVAILABLE_LOG =
  "[IntegraMed] SMTP no está configurado. No se generó ningún enlace de restablecimiento. Para asignar una contraseña en el servidor: npm run set-password -- <correo>. La contraseña se escribe en el prompt oculto o por stdin. No la pongas en los argumentos, en el entorno ni en un archivo.";
export const APP_BASE_URL_LOG =
  "[IntegraMed] APP_BASE_URL falta o no es https. En producción no se genera enlace de restablecimiento.";

function redactSecrets(text: string, secrets: string[]): string {
  let out = String(text);
  const sorted = secrets.filter((item) => item && item.length >= 8).sort((a, b) => b.length - a.length);
  for (const secret of sorted) out = out.split(secret).join("[redacted]");
  return out;
}

export type ResetDelivery = "smtp" | "dev-log" | "unavailable";

type MailEnv = {
  NODE_ENV?: string;
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  MAIL_FROM?: string;
  APP_BASE_URL?: string;
  PASSWORD_RESET_LOG_LINK?: string;
};

export function smtpConfigured(env: MailEnv = process.env): boolean {
  return Boolean(env.SMTP_HOST && env.MAIL_FROM);
}

export function httpsAppBaseUrl(value: string | undefined): boolean {
  const raw = String(value || "").trim();
  if (!raw) return false;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && Boolean(url.hostname);
  } catch {
    return false;
  }
}

/** Production reset links require an https APP_BASE_URL. Development may omit it. */
export function productionAppBaseUrlOk(env: MailEnv = process.env): boolean {
  if (env.NODE_ENV !== "production") return true;
  return httpsAppBaseUrl(env.APP_BASE_URL);
}

/** Production never prints the link. Development prints it only when PASSWORD_RESET_LOG_LINK=1. */
export function resetDeliveryMode(env: MailEnv = process.env): ResetDelivery {
  if (!productionAppBaseUrlOk(env)) return "unavailable";
  if (smtpConfigured(env)) return "smtp";
  if (env.NODE_ENV !== "production" && env.PASSWORD_RESET_LOG_LINK === "1") return "dev-log";
  return "unavailable";
}

export function resetUnavailableLog(env: MailEnv = process.env): string {
  if (!productionAppBaseUrlOk(env)) return APP_BASE_URL_LOG;
  return SMTP_UNAVAILABLE_LOG;
}

export function appBaseUrl(env: MailEnv = process.env): string {
  const configured = String(env.APP_BASE_URL || "").trim().replace(/\/+$/, "");
  if (env.NODE_ENV === "production") return httpsAppBaseUrl(configured) ? configured.replace(/\/+$/, "") : "";
  return configured || "http://localhost:3000";
}

export function resetLink(token: string, env: MailEnv = process.env): string {
  return `${appBaseUrl(env)}/acceso/restablecer?token=${encodeURIComponent(token)}`;
}

function logResetLink(to: string, link: string, env: MailEnv) {
  if (env.NODE_ENV === "production" || env.PASSWORD_RESET_LOG_LINK !== "1") return;
  const token = new URL(link).searchParams.get("token") || "";
  console.log("");
  console.log("========== IntegraMed: enlace para restablecer contraseña ==========");
  console.log("SMTP no configurado. Enlace visible solo porque PASSWORD_RESET_LOG_LINK=1 y NODE_ENV no es production.");
  console.log(`Para: ${to}`);
  console.log(`Token: ${token}`);
  console.log(link);
  console.log("Válido 45 minutos y de un solo uso.");
  console.log("Si la URL se corta en la terminal, abre /acceso/restablecer?token= y pega la línea Token.");
  console.log("====================================================================");
  console.log("");
}

type MailTransport = {
  sendMail: (message: { from?: string; to: string; subject: string; text: string }) => Promise<unknown>;
};

export async function sendPasswordResetEmail(
  to: string,
  link: string,
  transport?: MailTransport,
  env: MailEnv = process.env,
): Promise<"sent" | "logged" | "unavailable"> {
  const mode = resetDeliveryMode(env);
  if (mode === "dev-log") {
    logResetLink(to, link, env);
    return "logged";
  }
  if (mode === "unavailable") {
    console.error(resetUnavailableLog(env));
    return "unavailable";
  }

  const port = Number(env.SMTP_PORT || 587);
  const user = env.SMTP_USER || "";
  const pass = env.SMTP_PASS || "";
  const token = (() => {
    try {
      return new URL(link).searchParams.get("token") || "";
    } catch {
      return "";
    }
  })();
  try {
    const active =
      transport ||
      nodemailer.createTransport({
        host: env.SMTP_HOST,
        port,
        secure: port === 465,
        auth: user ? { user, pass } : undefined,
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 10_000,
      });
    await active.sendMail({
      from: env.MAIL_FROM,
      to,
      subject: "IntegraMed: restablece tu contraseña",
      text: [
        "Recibimos una solicitud para restablecer la contraseña de tu cuenta de IntegraMed.",
        "El enlace es válido durante 45 minutos y solo puede usarse una vez:",
        "",
        link,
        "",
        "Si no fuiste tú, ignora este mensaje.",
      ].join("\n"),
    });
    return "sent";
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error(
      "[IntegraMed] No se pudo enviar el correo de restablecimiento:",
      redactSecrets(detail, [link, token]),
    );
    return "unavailable";
  }
}
