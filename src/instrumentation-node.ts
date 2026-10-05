export const MAIL_UNCONFIGURED_LOG =
  "[IntegraMed] El correo de restablecimiento no está configurado (faltan SMTP_HOST o MAIL_FROM). La solicitud responde igual y no genera enlace. Para asignar una contraseña en el servidor: npm run set-password -- <correo> con SET_PASSWORD en el entorno. No pongas la contraseña en los argumentos ni en un archivo.";

export async function runNodeStartup(): Promise<void> {
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (process.env.NODE_ENV !== "production") return;
  try {
    const { assertRuntimeSecrets } = await import("@/lib/session-secret");
    assertRuntimeSecrets();
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
  if (!process.env.SMTP_HOST || !process.env.MAIL_FROM) console.error(MAIL_UNCONFIGURED_LOG);
  try {
    const { productionAppBaseUrlOk, APP_BASE_URL_LOG } = await import("@/lib/mailer");
    if (!productionAppBaseUrlOk()) console.error(APP_BASE_URL_LOG);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
  try {
    const { assertAuthRootWritable } = await import("@/lib/credentials");
    assertAuthRootWritable();
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}
