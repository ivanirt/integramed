import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createLocalFhirStore } from "../server/localFhir.js";
import { findAuthStaff } from "../server/staffLookup.js";
import { defaultAuthStorageRoot } from "../src/lib/auth-root.js";
import { blankAccount, readAccounts, writeAccounts } from "../src/lib/credentials.ts";
import { hashPassword } from "../src/lib/passwords.ts";
import { validateNewPassword } from "../src/lib/password-reset.ts";
import { readCliPassword, rejectPasswordArguments, warnDeprecatedPasswordEnv } from "./cli-password.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(repoRoot, ".env") });

const dataRoot = process.env.INTEGRAMED_DATA_ROOT
  ? path.resolve(process.env.INTEGRAMED_DATA_ROOT)
  : repoRoot;
const authRoot = defaultAuthStorageRoot(repoRoot);
let secretForRedaction = "";

function redact(text: string, secret: string) {
  if (!secret) return text;
  return text.split(secret).join("[redacted]");
}

function usage(): never {
  console.error("Uso: npm run set-password -- <correo-o-usuario> [--must-change]");
  console.error("La contraseña se escribe en un prompt oculto, o en una sola línea de stdin si no hay terminal.");
  console.error("No la pongas como argumento ni en SET_PASSWORD. Esa variable está en desuso y se ignora.");
  process.exit(1);
}

function parseArgs(argv: string[]) {
  const positional: string[] = [];
  let mustChange = false;
  for (const arg of argv) {
    if (arg === "--") continue;
    if (arg === "--must-change") {
      mustChange = true;
      continue;
    }
    if (arg.startsWith("--")) {
      console.error(`Opción desconocida: ${arg.split("=", 1)[0]}`);
      usage();
    }
    positional.push(arg);
  }
  const query = (positional[0] || "").trim().toLowerCase();
  if (!query || positional.length !== 1) usage();
  return { query, mustChange };
}

async function main() {
  const argv = process.argv.slice(2);
  rejectPasswordArguments(argv);
  warnDeprecatedPasswordEnv();
  const { query, mustChange } = parseArgs(argv);
  secretForRedaction = await readCliPassword();
  const secret = secretForRedaction;
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
  next.mustChangePassword = mustChange;
  next.resetTokenHash = null;
  next.resetExpiresAt = null;
  if (index === -1) accounts.push(next);
  else accounts[index] = next;
  writeAccounts(accounts, authRoot);
  const follow = mustChange ? " Hay que cambiarla al entrar." : "";
  console.log(`Contraseña actualizada para ${staff.email || staff.login}.${follow} No quedó escrita en el registro.`);
}

main().catch((err) => {
  const leaked = [secretForRedaction, process.env.SET_PASSWORD || "", process.env.CREATE_USER_PASSWORD || ""];
  const detail = err instanceof Error ? err.message : String(err);
  console.error(leaked.reduce((text, secret) => redact(text, secret), detail));
  secretForRedaction = "";
  process.exit(1);
});
