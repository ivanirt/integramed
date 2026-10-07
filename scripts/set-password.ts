import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createLocalFhirStore } from "../server/localFhir.js";
import { findAuthStaff } from "../server/staffLookup.js";
import { defaultAuthStorageRoot } from "../src/lib/auth-root.js";
import { blankAccount, readAccounts, writeAccounts } from "../src/lib/credentials.ts";
import { hashPassword } from "../src/lib/passwords.ts";
import { validateNewPassword } from "../src/lib/password-reset.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(repoRoot, ".env") });

const dataRoot = process.env.INTEGRAMED_DATA_ROOT
  ? path.resolve(process.env.INTEGRAMED_DATA_ROOT)
  : repoRoot;
const authRoot = defaultAuthStorageRoot(repoRoot);

function redact(text: string, secret: string) {
  if (!secret) return text;
  return text.split(secret).join("[redacted]");
}

function usage(): never {
  console.error("Uso: SET_PASSWORD='…' npm run set-password -- <correo-o-usuario>");
  console.error("La contraseña se lee de SET_PASSWORD o de una sola línea en stdin. No la pongas como argumento.");
  process.exit(1);
}

async function readSecret(): Promise<string> {
  const fromEnv = process.env.SET_PASSWORD || "";
  if (fromEnv) return fromEnv;
  if (process.stdin.isTTY) usage();
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8").replace(/\r?\n$/, "");
}

async function main() {
  const query = (process.argv.slice(2).find((arg) => arg !== "--") || "").trim().toLowerCase();
  if (!query || process.argv.slice(2).filter((arg) => arg !== "--").length !== 1) usage();
  const secret = await readSecret();
  if (!secret) usage();
  const problem = validateNewPassword(secret, secret);
  if (problem) {
    console.error(problem);
    process.exit(1);
  }

  const mode = String(process.env.FHIR_MODE || "local").toLowerCase();
  if (mode !== "local") {
    console.error(
      `[set-password] FHIR_MODE=${mode}. Este comando solo escribe el almacén local data/fhir. Con proxy remoto la app no verá el cambio.`,
    );
    process.exit(1);
  }

  const store = createLocalFhirStore(dataRoot);
  const staff = findAuthStaff(store.listType("Practitioner"), store.listType("PractitionerRole"), query);
  if (!staff) {
    console.error("No hay un Practitioner con ese correo o usuario.");
    process.exit(1);
  }

  const passwordHash = await hashPassword(secret);
  const accounts = readAccounts(authRoot);
  const queryIsEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(query);
  const index = accounts.findIndex(
    (account) => account.practitionerId === staff.id || account.email === query || account.email === staff.email,
  );
  const next = index === -1 ? blankAccount(staff.id, queryIsEmail ? query : staff.email, true) : accounts[index];
  next.practitionerId = staff.id;
  if (queryIsEmail) next.email = query;
  else if (!next.email) next.email = staff.email;
  next.passwordHash = passwordHash;
  next.passwordRequired = true;
  next.passwordChangedAt = Date.now();
  next.resetTokenHash = null;
  next.resetExpiresAt = null;
  if (index === -1) accounts.push(next);
  else accounts[index] = next;
  writeAccounts(accounts, authRoot);
  console.log(`Contraseña actualizada para ${staff.email || staff.login}. No quedó escrita en el registro.`);
}

main().catch((err) => {
  const secret = process.env.SET_PASSWORD || "";
  const detail = err instanceof Error ? err.message : String(err);
  console.error(redact(detail, secret));
  process.exit(1);
});
