import { credentialLinkedToPractitioner, findCredentialAccount, isServiceSession } from "./account-lookup.js";

function accountQuery(session) {
  return { id: session?.id, email: session?.email };
}

/**
 * True when this cookie was issued at or after the account's last password change.
 * No row for this id fails closed, including a username login whose account was relinked.
 * Service identities (seed-yeshua) have no row and stay allowed.
 */
export function isSessionPasswordCurrent(session, accounts) {
  if (!session?.id) return false;
  if (isServiceSession(session)) return true;
  const account = findCredentialAccount(accounts, accountQuery(session));
  if (!account) return false;
  if (!credentialLinkedToPractitioner(account, session.id)) return false;
  const changed = Number(account.passwordChangedAt || 0);
  if (!Number.isFinite(changed)) return false;
  const pwdAt = Number(session.pwdAt || 0);
  if (!Number.isFinite(pwdAt)) return false;
  return changed <= pwdAt;
}
