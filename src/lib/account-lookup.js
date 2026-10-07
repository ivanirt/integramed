/**
 * Operator sessions that have no accounts.json row.
 * seed-yeshua signs one of these for the loopback proxy. A clinic cookie cannot use the id
 * without SESSION_SECRET, which already lets the holder sign any session.
 */
export const SERVICE_SESSION_IDS = new Set(["seed-yeshua"]);

export function isServiceSession(session) {
  const id = String(session?.id || "").trim();
  return SERVICE_SESSION_IDS.has(id);
}

/**
 * One lookup for login, sessions, the proxy, password changes, and the CLIs.
 * A practitioner id match wins, even when an earlier row shares the email.
 * Email is a fallback so a recreated Practitioner is not treated as "no account".
 * `login` is used only when it contains "@" and `email` was not passed. A username
 * login is not an email. Callers that authorize a cookie pass the signed `email` claim.
 */
export function findCredentialAccount(accounts, query) {
  const list = Array.isArray(accounts) ? accounts : [];
  const id = String(query?.id || query?.practitionerId || "").trim();
  const email = String(query?.email || query?.login || "").trim().toLowerCase();
  if (id) {
    const byId = list.find((item) => item && item.practitionerId === id);
    if (byId) return byId;
  }
  if (!email || !email.includes("@")) return undefined;
  return list.find((item) => item && String(item.email || "").trim().toLowerCase() === email);
}

/** The row is this practitioner's, not merely the same mailbox. */
export function credentialLinkedToPractitioner(account, practitionerId) {
  const id = String(practitionerId || "").trim();
  return Boolean(account && id && account.practitionerId === id);
}
