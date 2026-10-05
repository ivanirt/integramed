import fs from "node:fs";
import path from "node:path";

export type CredentialAccount = {
  practitionerId: string;
  email: string;
  passwordHash: string | null;
  /** When true and there is no hash, the shared clinic password is rejected. */
  passwordRequired: boolean;
  /** Epoch ms of the last password change. Older sessions are rejected. */
  passwordChangedAt: number;
  resetTokenHash: string | null;
  resetExpiresAt: number | null;
};

export function credentialFile(root = process.cwd()): string {
  return path.join(root, "data", "auth", "accounts.json");
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

export function readAccounts(root = process.cwd()): CredentialAccount[] {
  try {
    const parsed = JSON.parse(fs.readFileSync(credentialFile(root), "utf8")) as {
      accounts?: Partial<CredentialAccount>[];
    };
    if (!Array.isArray(parsed.accounts)) return [];
    return parsed.accounts.map((account) => normalize(account)).filter((account): account is CredentialAccount => Boolean(account));
  } catch {
    return [];
  }
}

export function writeAccounts(accounts: CredentialAccount[], root = process.cwd()): void {
  const file = credentialFile(root);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify({ accounts }, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  fs.renameSync(tmp, file);
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
  root = process.cwd(),
): CredentialAccount[] {
  const accounts = readAccounts(root);
  mutate(accounts);
  writeAccounts(accounts, root);
  return accounts;
}

export function findAccountForStaff(
  accounts: CredentialAccount[],
  practitionerId: string,
  email: string,
): CredentialAccount | undefined {
  const mail = email.trim().toLowerCase();
  return accounts.find((account) => account.practitionerId === practitionerId || (mail && account.email === mail));
}
