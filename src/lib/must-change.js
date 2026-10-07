/** True only when the stored flag is boolean true. Missing means false. */
export function accountMustChangePassword(account) {
  return Boolean(account && account.mustChangePassword === true);
}

/**
 * accounts.json is the source of truth.
 * An unreadable store fails closed. A cookie claim cannot clear a true flag.
 */
export function passwordChangeRequired(session, accounts, readable = true) {
  if (!readable) return true;
  if (!session?.id) return false;
  const list = Array.isArray(accounts) ? accounts : [];
  const account = list.find((item) => item && item.practitionerId === session.id);
  if (!account) return false;
  return account.mustChangePassword === true;
}
