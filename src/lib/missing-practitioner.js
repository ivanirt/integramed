import fs from "node:fs";
import { accountsFile } from "./auth-root.js";

/**
 * Server log when accounts.json names a Practitioner the local store does not have.
 * The HTTP login response stays the uniform 401.
 */
export function missingPractitionerMessage(account) {
  const email = String(account?.email || "").trim().toLowerCase();
  const id = String(account?.practitionerId || "").trim();
  const who = email ? `${email} (Practitioner ${id})` : `Practitioner ${id}`;
  return `[IntegraMed] accounts.json tiene una cuenta para ${who}, pero ese Practitioner no está en el almacén FHIR. El login responde 401. Monta un volumen persistente en el directorio FHIR (en la imagen, /app/data/fhir, o INTEGRAMED_FHIR_ROOT).`;
}

export function readAccountEntries(authRoot) {
  try {
    const parsed = JSON.parse(fs.readFileSync(accountsFile(authRoot), "utf8"));
    return Array.isArray(parsed?.accounts) ? parsed.accounts : [];
  } catch {
    return [];
  }
}

/** Startup check: each accounts.json practitionerId must exist in the local store. */
export function logAccountsMissingFromStore(accounts, practitionerIds, log = console.error) {
  const known = new Set(practitionerIds || []);
  let count = 0;
  for (const account of accounts || []) {
    const id = String(account?.practitionerId || "").trim();
    if (!id || known.has(id)) continue;
    log(missingPractitionerMessage(account));
    count += 1;
  }
  return count;
}

/**
 * Login check: staff-lookup found nobody, but accounts.json has this email.
 * Does not change the 401 body.
 */
export function logMissingPractitionerOnLogin(query, accounts, log = console.error) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return false;
  const match = (accounts || []).find((account) => {
    const email = String(account?.email || "").trim().toLowerCase();
    return account?.practitionerId && email === q;
  });
  if (!match) return false;
  log(missingPractitionerMessage(match));
  return true;
}
