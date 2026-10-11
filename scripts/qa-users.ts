import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createLocalFhirStore } from "../server/localFhir.js";
import { defaultAuthStorageRoot } from "../src/lib/auth-root.js";
import { blankAccount, readAccounts, writeAccounts, type CredentialAccount } from "../src/lib/credentials.ts";
import { hashPassword } from "../src/lib/passwords.ts";
import { validateNewPassword } from "../src/lib/password-reset.ts";
import { ROLE_LABELS, SYSTEMS, type RoleId } from "../src/lib/roles.ts";

const TEST_EMAIL = /^qa\+[a-z0-9_-]+@integramed\.local$/;

export type StoredTestUser = {
  role: string;
  email: string;
  password: string;
  practitionerId: string;
  updatedAt: string;
};

type Practitioner = {
  id?: string;
  telecom?: { system?: string; value?: string }[];
  identifier?: { system?: string; value?: string }[];
};

type RoleResource = {
  id?: string;
  practitioner?: { reference?: string };
};

/** Roles exported by src/lib/roles.ts. New keys in ROLE_LABELS are included without editing this script. */
export function definedRoles(): RoleId[] {
  return Object.keys(ROLE_LABELS) as RoleId[];
}

export function testUserEmail(role: string): string {
  const slug = role
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug) throw new Error("El rol no tiene un identificador usable.");
  return `qa+${slug}@integramed.local`;
}

export function isTestUserEmail(email: string): boolean {
  return TEST_EMAIL.test(email.trim().toLowerCase());
}

export function generatePassword(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const alphabet = `${letters}${digits}`;
  const bytes = crypto.randomBytes(32);
  const chars = Array.from(bytes, (byte) => alphabet[byte % alphabet.length] || "a");
  chars[0] = letters[bytes[0] % letters.length] || "A";
  chars[1] = digits[bytes[1] % digits.length] || "2";
  const password = chars.join("");
  if (validateNewPassword(password, password)) {
    throw new Error("No se pudo generar una contraseña válida.");
  }
  return password;
}

export function credentialsPath(root: string): string {
  return path.join(root, ".local", "test-users.json");
}

export function readTestUserFile(root: string): StoredTestUser[] {
  try {
    const parsed = JSON.parse(fs.readFileSync(credentialsPath(root), "utf8")) as { users?: StoredTestUser[] };
    return Array.isArray(parsed.users) ? parsed.users.filter((user) => user && isTestUserEmail(user.email)) : [];
  } catch {
    return [];
  }
}

export function writeTestUserFile(root: string, users: StoredTestUser[]): void {
  const file = credentialsPath(root);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify({ users }, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  fs.renameSync(tmp, file);
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

function matchesTestIdentity(resource: Practitioner, email: string) {
  return emailOf(resource) === email || loginOf(resource) === email;
}

function accountsRoot(repoRoot: string): string {
  return defaultAuthStorageRoot(repoRoot);
}

function upsertCredential(
  root: string,
  practitionerId: string,
  email: string,
  passwordHash: string | null,
  replacePassword: boolean,
) {
  const accounts = readAccounts(accountsRoot(root));
  const index = accounts.findIndex((account) => account.practitionerId === practitionerId || account.email === email);
  if (index === -1) {
    const account = blankAccount(practitionerId, email, true);
    if (passwordHash) {
      account.passwordHash = passwordHash;
      account.passwordChangedAt = Date.now();
    }
    accounts.push(account);
    writeAccounts(accounts, accountsRoot(root));
    return;
  }
  const current = accounts[index] as CredentialAccount;
  current.practitionerId = practitionerId;
  current.email = email;
  current.passwordRequired = true;
  if (replacePassword && passwordHash) {
    current.passwordHash = passwordHash;
    current.passwordChangedAt = Date.now();
    current.resetTokenHash = null;
    current.resetExpiresAt = null;
  }
  accounts[index] = current;
  writeAccounts(accounts, accountsRoot(root));
}

export async function seedTestUsers(root: string, options: { rotate: boolean }) {
  const roles = definedRoles();
  const { listType, writeResource } = createLocalFhirStore(root);
  const practitioners = listType("Practitioner") as Practitioner[];
  const roleResources = listType("PractitionerRole") as RoleResource[];
  const stored = readTestUserFile(root);
  const lines: string[] = [];

  for (const role of roles) {
    const email = testUserEmail(role);
    const label = ROLE_LABELS[role] || role;
    const matches = practitioners.filter((item) => matchesTestIdentity(item, email));
    let practitioner = matches[0];
    let created = false;
    if (!practitioner) {
      practitioner = writeResource({
        resourceType: "Practitioner",
        id: newId(),
        active: true,
        name: [{ use: "official", family: role, given: ["QA"] }],
        telecom: [{ system: "email", value: email }],
        identifier: [
          { system: SYSTEMS.login, value: email },
          { system: SYSTEMS.role, value: role },
          { system: "https://integramed.app/fhir/test-user", value: role },
        ],
      }) as Practitioner;
      practitioners.push(practitioner);
      created = true;
    }

    const practitionerId = practitioner.id || "";
    if (!practitionerId) throw new Error(`No se pudo guardar el usuario de ${role}.`);

    const linked = roleResources.some((item) => item.practitioner?.reference === `Practitioner/${practitionerId}`);
    if (!linked) {
      const createdRole = writeResource({
        resourceType: "PractitionerRole",
        id: newId(),
        active: true,
        practitioner: { reference: `Practitioner/${practitionerId}` },
        code: [{ coding: [{ system: SYSTEMS.role, code: role, display: label }] }],
      }) as RoleResource;
      roleResources.push(createdRole);
    }

    const previous = stored.find((user) => user.email === email);
    const existingAccount = readAccounts(accountsRoot(root)).find(
      (account) => account.practitionerId === practitionerId || account.email === email,
    );
    const repairHash = !options.rotate && !created && Boolean(previous?.password) && !existingAccount?.passwordHash;
    const needsPassword = options.rotate || created || !previous?.password || !existingAccount?.passwordHash;
    let password = previous?.password || "";
    let status = created ? "creado" : "ya existía";
    if (needsPassword) {
      if (!repairHash) password = generatePassword();
      const passwordHash = await hashPassword(password);
      upsertCredential(root, practitionerId, email, passwordHash, true);
      if (!created) status = repairHash ? "credencial reparada" : "contraseña regenerada";
    } else {
      upsertCredential(root, practitionerId, email, null, false);
    }

    const record: StoredTestUser = {
      role,
      email,
      password,
      practitionerId,
      updatedAt: new Date().toISOString(),
    };
    const index = stored.findIndex((user) => user.email === email);
    if (index === -1) stored.push(record);
    else stored[index] = record;

    lines.push(`${email}  ${role}  ${status}`);
  }

  writeTestUserFile(root, stored);
  return { lines, file: credentialsPath(root), count: roles.length };
}

export function removeTestUsers(root: string) {
  const { listType, deleteResource } = createLocalFhirStore(root);
  const practitioners = listType("Practitioner") as Practitioner[];
  const victims = practitioners.filter((item) => isTestUserEmail(emailOf(item)) || isTestUserEmail(loginOf(item)));
  const ids = new Set(victims.map((item) => item.id).filter((id): id is string => Boolean(id)));
  const lines: string[] = [];

  for (const practitioner of victims) {
    if (!practitioner.id) continue;
    deleteResource("Practitioner", practitioner.id);
    lines.push(`${emailOf(practitioner) || loginOf(practitioner)}  eliminado`);
  }

  const roleResources = listType("PractitionerRole") as RoleResource[];
  for (const roleResource of roleResources) {
    const ref = roleResource.practitioner?.reference || "";
    const id = ref.replace(/^Practitioner\//, "");
    if (roleResource.id && ids.has(id)) deleteResource("PractitionerRole", roleResource.id);
  }

  const accounts = readAccounts(accountsRoot(root)).filter(
    (account) => !ids.has(account.practitionerId) && !isTestUserEmail(account.email),
  );
  writeAccounts(accounts, accountsRoot(root));

  if (fs.existsSync(credentialsPath(root))) fs.rmSync(credentialsPath(root));

  return { lines, removed: victims.length };
}
