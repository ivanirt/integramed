import bcrypt from "bcryptjs";

const ROUNDS = 12;

/**
 * Cost-12 hash compared when login has no stored hash, so that path takes the same
 * bcrypt time as a wrong password. It is not a credential and matches no account.
 */
export const DUMMY_PASSWORD_HASH = "$2b$12$bqG9e7OPEImGc712CklRiejC.h4fD3E5TGQH3bxR0SMtXnfvN.BTC";

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, ROUNDS);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  if (!passwordHash) return false;
  try {
    return await bcrypt.compare(password, passwordHash);
  } catch {
    return false;
  }
}

type LoginAccount = {
  passwordHash: string | null;
  passwordChangedAt?: number;
} | null | undefined;

/** Same result for an unknown user, an account with no hash, and a wrong password. */
export async function checkLoginPassword(
  password: string,
  account: LoginAccount,
): Promise<{ ok: true; pwdAt: number } | { ok: false }> {
  if (!account?.passwordHash) {
    await verifyPassword(password, DUMMY_PASSWORD_HASH);
    return { ok: false };
  }
  const matches = await verifyPassword(password, account.passwordHash);
  if (!matches) return { ok: false };
  return { ok: true, pwdAt: Number(account.passwordChangedAt || 0) };
}
