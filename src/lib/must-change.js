import { credentialLinkedToPractitioner, findCredentialAccount } from "./account-lookup.js";

/** True only when the stored flag is boolean true. Missing means false. */
export function accountMustChangePassword(account) {
  return Boolean(account && account.mustChangePassword === true);
}

/**
 * accounts.json is the source of truth.
 * An unreadable store fails closed. A cookie claim cannot clear a true flag.
 * An account found only by email fails closed: the session id is not that row.
 */
export function passwordChangeRequired(session, accounts, readable = true) {
  if (!readable) return true;
  if (!session?.id) return false;
  const account = findCredentialAccount(accounts, session);
  if (!account) return false;
  if (!credentialLinkedToPractitioner(account, session.id)) return true;
  return account.mustChangePassword === true;
}
