import nodemailer from "nodemailer";

export function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.MAIL_FROM);
}

export function appBaseUrl(): string {
  return (process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
}

export function resetLink(token: string): string {
  return `${appBaseUrl()}/acceso/restablecer?token=${encodeURIComponent(token)}`;
}

function logResetLink(to: string, link: string, reason: string) {
  const token = new URL(link).searchParams.get("token") || "";
  console.log("");
  console.log("========== IntegraMed: enlace para restablecer contraseña ==========");
  console.log(reason);
  console.log(`Para: ${to}`);
  console.log(`Token: ${token}`);
  console.log(link);
  console.log("Válido 45 minutos y de un solo uso.");
  console.log("Si la URL se corta en la terminal, abre /acceso/restablecer?token= y pega la línea Token.");
  console.log("====================================================================");
  console.log("");
}

export async function sendPasswordResetEmail(to: string, link: string): Promise<void> {
  if (!smtpConfigured()) {
    logResetLink(to, link, "SMTP no configurado. El enlace se imprime aquí para poder probar en local.");
    return;
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";
  try {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: user ? { user, pass } : undefined,
    });
    await transport.sendMail({
      from: process.env.MAIL_FROM,
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
  } catch (err) {
    console.error(
      "[IntegraMed] No se pudo enviar el correo de restablecimiento:",
      err instanceof Error ? err.message : err,
    );
    if (process.env.NODE_ENV !== "production") {
      logResetLink(to, link, "El envío SMTP falló. En desarrollo el enlace se imprime aquí.");
    }
  }
}
