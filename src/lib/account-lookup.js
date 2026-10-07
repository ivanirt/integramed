/**
 * One lookup for login, sessions, the proxy, and password changes.
 * A practitioner id match wins. An email match is only a fallback so a
 * recreated Practitioner cannot be treated as "no account".
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
