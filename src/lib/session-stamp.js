import { credentialLinkedToPractitioner, findCredentialAccount } from "./account-lookup.js";

/** True when this cookie was issued at or after the account's last password change. */
export function isSessionPasswordCurrent(session, accounts) {
  if (!session?.id) return false;
  const account = findCredentialAccount(accounts, session);
  if (!account) return true;
  if (!credentialLinkedToPractitioner(account, session.id)) return false;
  const changed = Number(account.passwordChangedAt || 0);
  if (!Number.isFinite(changed)) return false;
  const pwdAt = Number(session.pwdAt || 0);
  if (!Number.isFinite(pwdAt)) return false;
  return changed <= pwdAt;
}
