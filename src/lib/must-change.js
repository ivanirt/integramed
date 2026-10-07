import { credentialLinkedToPractitioner, findCredentialAccount, isServiceSession } from "./account-lookup.js";

/** True only when the stored flag is boolean true. Missing means false. */
export function accountMustChangePassword(account) {
  return Boolean(account && account.mustChangePassword === true);
}

/**
 * accounts.json is the source of truth.
 * An unreadable store fails closed. A cookie claim cannot clear a true flag.
 * An account found only by email fails closed: the session id is not that row.
 * No row for the session id also fails closed. Service identities are exempt.
 */
export function passwordChangeRequired(session, accounts, readable = true) {
  if (!readable) return true;
  if (!session?.id) return false;
  if (isServiceSession(session)) return false;
  const account = findCredentialAccount(accounts, { id: session.id, email: session.email });
  if (!account) return true;
  if (!credentialLinkedToPractitioner(account, session.id)) return true;
  return account.mustChangePassword === true;
}
