import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createLocalFhirStore } from "../server/localFhir.js";
import { defaultAuthStorageRoot } from "../src/lib/auth-root.js";
import { findCredentialAccount } from "../src/lib/account-lookup.js";
import { blankAccount, mutateAccounts } from "../src/lib/credentials.ts";
import { hashPassword } from "../src/lib/passwords.ts";
import { validateNewPassword } from "../src/lib/password-reset.ts";
import { ROLE_LABELS, SYSTEMS, type RoleId } from "../src/lib/roles.ts";
import { readCliPassword, rejectPasswordArguments, warnDeprecatedPasswordEnv } from "./cli-password.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env") });
const authRoot = defaultAuthStorageRoot(root);

const ROLES = Object.keys(ROLE_LABELS) as RoleId[];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Practitioner = {
  id?: string;
  resourceType?: string;
  telecom?: { system?: string; value?: string }[];
  identifier?: { system?: string; value?: string }[];
  name?: { given?: string[]; family?: string }[];
};

function usage(): never {
  console.error(
    "Uso: npm run create-user -- --email <correo> [--given Nombre] [--family Apellido] [--role admin] [--prefix Lic.] [--must-change]",
  );
  console.error("El correo también puede ir como primer argumento, sin --email.");
  console.error("Con --must-change la contraseña se escribe en un prompt oculto (o por stdin si no hay terminal). No la pongas como argumento ni en el entorno.");
  process.exit(1);
}

function parseArgs(argv: string[]) {
  const positional: string[] = [];
  let given = "";
  let family = "";
  let role = "admin";
  let prefix = "";
  let emailFlag = "";
  let mustChange = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--given") given = argv[++i] || "";
    else if (arg === "--family") family = argv[++i] || "";
    else if (arg === "--role") role = argv[++i] || "";
    else if (arg === "--prefix") prefix = argv[++i] || "";
    else if (arg === "--email") emailFlag = argv[++i] || "";
    else if (arg === "--must-change") mustChange = true;
    else if (arg === "--") continue;
    else if (arg.startsWith("--")) {
      console.error(`Opción desconocida: ${arg.split("=", 1)[0]}`);
      usage();
    } else positional.push(arg);
  }
  const positionalEmail = (positional[0] || "").trim().toLowerCase();
  const flaggedEmail = emailFlag.trim().toLowerCase();
  if (flaggedEmail && positionalEmail && flaggedEmail !== positionalEmail) usage();
  const email = flaggedEmail || positionalEmail;
  if (!EMAIL.test(email) || positional.length > 1) usage();
  if (!ROLES.includes(role as RoleId)) {
    console.error(`Rol no válido: ${role}. Usa uno de: ${ROLES.join(", ")}`);
    process.exit(1);
  }
  if (!given) {
    const local = email.split("@")[0] || "Usuario";
    given = local.charAt(0).toUpperCase() + local.slice(1);
  }
  return {
    email,
    given: given.trim(),
    family: family.trim(),
    role: role as RoleId,
    prefix: prefix.trim(),
    mustChange,
  };
}

function newId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

function emailOf(resource: Practitioner) {
  return resource.telecom?.find((item) => item.system === "email")?.value?.trim().toLowerCase() || "";
}

function loginOf(resource: Practitioner) {
  return resource.identifier?.find((item) => item.system === SYSTEMS.login)?.value?.trim().toLowerCase() || "";
}

async function main() {
  const argv = process.argv.slice(2);
  rejectPasswordArguments(argv);
  warnDeprecatedPasswordEnv();
  const options = parseArgs(argv);
  const mode = String(process.env.FHIR_MODE || "local").toLowerCase();
  if (mode !== "local") {
    console.warn(
      `[create-user] FHIR_MODE=${mode}. Este comando solo escribe el almacén local data/fhir. Con proxy remoto la app no verá al usuario.`,
    );
  }

  let plain = "";
  let passwordHash: string | null = null;
  if (options.mustChange) {
    plain = await readCliPassword();
    const problem = validateNewPassword(plain, plain);
    if (problem) {
      console.error(problem);
      process.exit(1);
    }
    passwordHash = await hashPassword(plain);
    plain = "";
  }

  const { listType, writeResource } = createLocalFhirStore(root);
  const practitioners = listType("Practitioner") as Practitioner[];
  let practitioner = practitioners.find(
    (item) => emailOf(item) === options.email || loginOf(item) === options.email,
  );
  let createdPractitioner = false;

  if (!practitioner) {
    practitioner = writeResource({
      resourceType: "Practitioner",
      id: newId(),
      active: true,
      name: [
        {
          use: "official",
          family: options.family || undefined,
          given: [options.given],
          prefix: options.prefix ? [options.prefix] : [],
        },
      ],
      telecom: [{ system: "email", value: options.email }],
      identifier: [
        { system: SYSTEMS.login, value: options.email },
        { system: SYSTEMS.role, value: options.role },
      ],
    }) as Practitioner;
    createdPractitioner = true;
  }

  const practitionerId = practitioner.id;
  if (!practitionerId) {
    console.error("No se pudo guardar el Practitioner.");
    process.exit(1);
  }

  const roles = listType("PractitionerRole") as { practitioner?: { reference?: string } }[];
  const linked = roles.some((item) => item.practitioner?.reference === `Practitioner/${practitionerId}`);
  if (!linked) {
    writeResource({
      resourceType: "PractitionerRole",
      id: newId(),
      active: true,
      practitioner: { reference: `Practitioner/${practitionerId}` },
      code: [{ coding: [{ system: SYSTEMS.role, code: options.role, display: ROLE_LABELS[options.role] }] }],
    });
  }

  let passwordNote = "";
  mutateAccounts((accounts) => {
    const match = findCredentialAccount(accounts, { id: practitionerId, email: options.email });
    const index = match ? accounts.indexOf(match) : -1;
    if (index === -1) {
      const account = blankAccount(practitionerId, options.email, true);
      if (passwordHash) {
        account.passwordHash = passwordHash;
        account.passwordChangedAt = Date.now();
        account.mustChangePassword = true;
      }
      accounts.push(account);
      passwordNote = passwordHash
        ? "Contraseña temporal definida. Hay que cambiarla al entrar. No quedó escrita en el registro."
        : "Contraseña: sin definir. Usa npm run set-password o el correo de restablecimiento.";
      return;
    }
    const account = accounts[index];
    account.practitionerId = practitionerId;
    account.email = options.email;
    if (passwordHash) {
      account.passwordHash = passwordHash;
      account.passwordRequired = true;
      account.passwordChangedAt = Date.now();
      account.mustChangePassword = true;
      account.resetTokenHash = null;
      account.resetExpiresAt = null;
      passwordNote = "Contraseña temporal definida. Hay que cambiarla al entrar. No quedó escrita en el registro.";
    } else if (account.passwordHash) {
      passwordNote = "La contraseña ya existente no se modificó.";
    } else {
      account.passwordRequired = true;
      passwordNote = "Sigue sin contraseña usable. Usa npm run set-password o «¿Olvidaste tu contraseña?».";
    }
    accounts[index] = account;
  }, authRoot);

  const verb = createdPractitioner ? "Usuario creado" : "El usuario ya existía";
  console.log(`${verb}: ${options.email}`);
  console.log(`Practitioner: ${practitionerId}`);
  console.log(`Nombre: ${[options.given, options.family].filter(Boolean).join(" ")}`);
  console.log(`Rol: ${options.role}`);
  console.log(passwordNote);
  if (!passwordHash || passwordNote.includes("no se modificó") || passwordNote.includes("Sigue sin")) {
    console.log("");
    console.log("Para definir una contraseña temporal, sin escribirla en un archivo, en los argumentos ni en el registro:");
    console.log(`npm run create-user -- --email ${options.email} --role ${options.role} --must-change`);
    console.log("La contraseña se escribe en el prompt oculto. Con SMTP también vale «¿Olvidaste tu contraseña?» en /acceso.");
  } else {
    console.log("Al entrar en /acceso tendrá que elegir una contraseña nueva.");
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
