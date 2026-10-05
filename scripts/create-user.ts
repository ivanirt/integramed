import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createLocalFhirStore } from "../server/localFhir.js";
import { blankAccount, readAccounts, writeAccounts } from "../src/lib/credentials.ts";
import { hashPassword } from "../src/lib/passwords.ts";
import { validateNewPassword } from "../src/lib/password-reset.ts";
import { ROLE_LABELS, SYSTEMS, type RoleId } from "../src/lib/roles.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env") });

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
    "Uso: npm run create-user -- <correo> [--given Nombre] [--family Apellido] [--role admin] [--prefix Lic.]",
  );
  process.exit(1);
}

function parseArgs(argv: string[]) {
  const positional: string[] = [];
  let given = "";
  let family = "";
  let role = "admin";
  let prefix = "";
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--given") given = argv[++i] || "";
    else if (arg === "--family") family = argv[++i] || "";
    else if (arg === "--role") role = argv[++i] || "";
    else if (arg === "--prefix") prefix = argv[++i] || "";
    else if (arg === "--") continue;
    else if (arg.startsWith("--")) {
      console.error(`Opción desconocida: ${arg}`);
      usage();
    } else positional.push(arg);
  }
  const email = (positional[0] || "").trim().toLowerCase();
  if (!EMAIL.test(email) || positional.length > 1) usage();
  if (!ROLES.includes(role as RoleId)) {
    console.error(`Rol no válido: ${role}. Usa uno de: ${ROLES.join(", ")}`);
    process.exit(1);
  }
  if (!given) {
    const local = email.split("@")[0] || "Usuario";
    given = local.charAt(0).toUpperCase() + local.slice(1);
  }
  return { email, given: given.trim(), family: family.trim(), role: role as RoleId, prefix: prefix.trim() };
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
  const options = parseArgs(process.argv.slice(2));
  const mode = String(process.env.FHIR_MODE || "local").toLowerCase();
  if (mode !== "local") {
    console.warn(
      `[create-user] FHIR_MODE=${mode}. Este comando solo escribe el almacén local data/fhir. Con proxy remoto la app no verá al usuario.`,
    );
  }

  const plain = process.env.CREATE_USER_PASSWORD || "";
  let passwordHash: string | null = null;
  if (plain) {
    const problem = validateNewPassword(plain, plain);
    if (problem) {
      console.error(problem);
      process.exit(1);
    }
    passwordHash = await hashPassword(plain);
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

  const accounts = readAccounts(root);
  const index = accounts.findIndex(
    (account) => account.practitionerId === practitionerId || account.email === options.email,
  );
  let passwordNote: string;
  if (index === -1) {
    const account = blankAccount(practitionerId, options.email, true);
    if (passwordHash) {
      account.passwordHash = passwordHash;
      account.passwordChangedAt = Date.now();
    }
    accounts.push(account);
    writeAccounts(accounts, root);
    passwordNote = passwordHash
      ? "Contraseña definida desde CREATE_USER_PASSWORD (no quedó escrita en el repositorio)."
      : "Contraseña: sin definir. La contraseña maestra de la clínica no sirve para esta cuenta.";
  } else {
    const account = accounts[index];
    account.practitionerId = practitionerId;
    account.email = options.email;
    if (passwordHash && !account.passwordHash) {
      account.passwordHash = passwordHash;
      account.passwordRequired = true;
      account.passwordChangedAt = Date.now();
      account.resetTokenHash = null;
      account.resetExpiresAt = null;
      passwordNote = "Contraseña inicial definida desde CREATE_USER_PASSWORD. La anterior no existía.";
    } else if (account.passwordHash) {
      passwordNote = "La contraseña ya existente no se modificó.";
    } else {
      account.passwordRequired = true;
      passwordNote = "Sigue sin contraseña usable. Usa «¿Olvidaste tu contraseña?» para definirla.";
    }
    accounts[index] = account;
    writeAccounts(accounts, root);
  }

  const verb = createdPractitioner ? "Usuario creado" : "El usuario ya existía";
  console.log(`${verb}: ${options.email}`);
  console.log(`Practitioner: ${practitionerId}`);
  console.log(`Nombre: ${[options.given, options.family].filter(Boolean).join(" ")}`);
  console.log(`Rol: ${options.role}`);
  console.log(passwordNote);
  if (!passwordHash || passwordNote.includes("no se modificó") || passwordNote.includes("Sigue sin")) {
    console.log("");
    console.log("Para elegir la contraseña, con la app en marcha (npm run dev):");
    console.log("1. Abre http://localhost:3000/acceso");
    console.log("2. Pulsa «¿Olvidaste tu contraseña?»");
    console.log(`3. Escribe ${options.email}`);
    console.log("4. Abre el enlace del correo. Si SMTP no está configurado, cópialo de la consola del proceso web.");
  } else {
    console.log("Ya puede entrar en http://localhost:3000/acceso con ese correo.");
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
