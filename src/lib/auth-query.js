const AUTH_QUERY = /^[A-Za-z0-9._%+-]+(?:@[A-Za-z0-9.-]+\.[A-Za-z]{2,})?$/;

/** Login or email. Rejects "|", spaces, and control characters. */
export function isAuthLookupQuery(value) {
  const raw = String(value ?? "");
  if (/[|\u0000-\u001F\u007F]/.test(raw)) return false;
  const query = raw.trim();
  if (!query || query.length > 320) return false;
  return AUTH_QUERY.test(query);
}
