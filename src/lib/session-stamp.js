/** True when this cookie was issued at or after the account's last password change. */
export function isSessionPasswordCurrent(session, accounts) {
  if (!session?.id) return false;
  const list = Array.isArray(accounts) ? accounts : [];
  const account = list.find((item) => item && item.practitionerId === session.id);
  if (!account) return true;
  const changed = Number(account.passwordChangedAt || 0);
  if (!Number.isFinite(changed)) return false;
  const pwdAt = Number(session.pwdAt || 0);
  if (!Number.isFinite(pwdAt)) return false;
  return changed <= pwdAt;
}
