import fs from "node:fs";
import path from "node:path";
import { accountsFile, authStorageRoot } from "./auth-root.js";
import { authRootProblem } from "./startup-data.js";

export type CredentialAccount = {
  practitionerId: string;
  email: string;
  passwordHash: string | null;
  /** Account must use a personal password. There is no shared-password fallback. */
  passwordRequired: boolean;
  /** Epoch ms of the last password change. Older sessions are rejected. */
  passwordChangedAt: number;
  resetTokenHash: string | null;
  resetExpiresAt: number | null;
};

const PINNED_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function defaultAuthRoot(): string {
  return authStorageRoot();
}

export function credentialFile(root = defaultAuthRoot()): string {
  return accountsFile(root);
}

function normalize(raw: Partial<CredentialAccount> | null | undefined): CredentialAccount | null {
  if (!raw || typeof raw.practitionerId !== "string" || !raw.practitionerId) return null;
  return {
    practitionerId: raw.practitionerId,
    email: String(raw.email || "").trim().toLowerCase(),
    passwordHash: raw.passwordHash ? String(raw.passwordHash) : null,
    passwordRequired: Boolean(raw.passwordRequired),
    passwordChangedAt: Number(raw.passwordChangedAt || 0),
    resetTokenHash: raw.resetTokenHash ? String(raw.resetTokenHash) : null,
    resetExpiresAt: raw.resetExpiresAt == null ? null : Number(raw.resetExpiresAt),
  };
}

type AccountStore = { accounts: CredentialAccount[]; revision: number };

function readStore(root: string): AccountStore {
  try {
    const parsed = JSON.parse(fs.readFileSync(credentialFile(root), "utf8")) as {
      accounts?: Partial<CredentialAccount>[];
      revision?: number;
    };
    const accounts = Array.isArray(parsed.accounts)
      ? parsed.accounts.map((account) => normalize(account)).filter((account): account is CredentialAccount => Boolean(account))
      : [];
    const revision = Number(parsed.revision || 0);
    return { accounts, revision: Number.isFinite(revision) && revision >= 0 ? revision : 0 };
  } catch {
    return { accounts: [], revision: 0 };
  }
}

export function readAccounts(root = defaultAuthRoot()): CredentialAccount[] {
  return readStore(root).accounts;
}

function writeAccountsAtomic(accounts: CredentialAccount[], root: string, revision: number): void {
  const file = credentialFile(root);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  const payload = `${JSON.stringify({ revision, accounts }, null, 2)}\n`;
  const fd = fs.openSync(tmp, "w", 0o600);
  try {
    fs.writeSync(fd, payload);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tmp, file);
}

const held = new Set<string>();

function sleepBriefly(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function acquireLock(dir: string): () => void {
  fs.mkdirSync(dir, { recursive: true });
  const lockPath = path.join(dir, "accounts.lock");
  const deadline = Date.now() + 3000;
  for (;;) {
    try {
      const fd = fs.openSync(lockPath, "wx", 0o600);
      fs.closeSync(fd);
      return () => {
        try {
          fs.rmSync(lockPath, { force: true });
        } catch {
          /* another writer already removed it */
        }
      };
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== "EEXIST") throw err;
      try {
        const age = Date.now() - fs.statSync(lockPath).mtimeMs;
        if (age > 10_000) fs.rmSync(lockPath, { force: true });
      } catch {
        /* the lock disappeared while we looked */
      }
      if (Date.now() > deadline) throw new Error("No se pudo bloquear accounts.json");
      sleepBriefly(20);
    }
  }
}

function withAuthLock<T>(root: string, fn: () => T): T {
  const key = path.resolve(root);
  if (held.has(key)) throw new Error("mutateAccounts ya está escribiendo este directorio");
  held.add(key);
  const release = acquireLock(key);
  try {
    return fn();
  } finally {
    release();
    held.delete(key);
  }
}

export function writeAccounts(accounts: CredentialAccount[], root = defaultAuthRoot()): void {
  withAuthLock(root, () => {
    const revision = readStore(root).revision + 1;
    writeAccountsAtomic(accounts, root, revision);
  });
}

export function blankAccount(practitionerId: string, email: string, passwordRequired: boolean): CredentialAccount {
  return {
    practitionerId,
    email: email.trim().toLowerCase(),
    passwordHash: null,
    passwordRequired,
    passwordChangedAt: 0,
    resetTokenHash: null,
    resetExpiresAt: null,
  };
}

export function mutateAccounts(
  mutate: (accounts: CredentialAccount[]) => void,
  root = defaultAuthRoot(),
): CredentialAccount[] {
  return withAuthLock(root, () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const before = readStore(root);
      const accounts = before.accounts.map((account) => ({ ...account }));
      mutate(accounts);
      if (readStore(root).revision !== before.revision) continue;
      writeAccountsAtomic(accounts, root, before.revision + 1);
      if (readStore(root).revision === before.revision + 1) return accounts;
    }
    throw new Error("No se pudo guardar accounts.json");
  });
}

export function findAccountForStaff(
  accounts: CredentialAccount[],
  practitionerId: string,
  email: string,
): CredentialAccount | undefined {
  const mail = email.trim().toLowerCase();
  return accounts.find((account) => account.practitionerId === practitionerId || (mail && account.email === mail));
}

/** Email stored by create-user or set-password. FHIR telecom is not a reset destination. */
export function pinnedAccountEmail(accounts: CredentialAccount[], practitionerId: string): string | null {
  const account = accounts.find((item) => item.practitionerId === practitionerId);
  const email = account?.email?.trim().toLowerCase() || "";
  if (!PINNED_EMAIL.test(email)) return null;
  return email;
}

export function storeResetOnPinnedAccount(
  accounts: CredentialAccount[],
  practitionerId: string,
  record: { tokenHash: string | null; expiresAt: number | null },
): boolean {
  const index = accounts.findIndex((item) => item.practitionerId === practitionerId);
  if (index < 0) return false;
  const email = accounts[index]?.email?.trim().toLowerCase() || "";
  if (!PINNED_EMAIL.test(email)) return false;
  const current = accounts[index];
  if (!current) return false;
  accounts[index] = {
    ...current,
    email,
    resetTokenHash: record.tokenHash,
    resetExpiresAt: record.expiresAt,
  };
  return true;
}

export function assertAuthRootWritable(root = defaultAuthRoot()): void {
  const problem = authRootProblem(root);
  if (problem) throw new Error(problem);
}
