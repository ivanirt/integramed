/**
 * Empty FHIR_MODE means `proxy` for the server and the supervisor: a deploy
 * that forgets the variable must not start writing a local clinical store.
 * The password CLIs pass `local` so `npm run create-user` still works in a
 * checkout that has no FHIR server. Any other value is compared case-insensitively.
 */
export function resolvedFhirMode(env = process.env, defaultMode = "proxy") {
  const raw = env?.FHIR_MODE;
  if (raw == null || String(raw).trim() === "") return defaultMode;
  return String(raw).trim().toLowerCase();
}

export function fhirModeIsLocal(env = process.env, defaultMode = "proxy") {
  return resolvedFhirMode(env, defaultMode) === "local";
}
