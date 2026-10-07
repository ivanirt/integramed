import path from "node:path";

/**
 * Directory that contains the local FHIR JSON files (Practitioner/, Patient/, …).
 * INTEGRAMED_FHIR_ROOT overrides the default <project>/data/fhir.
 */
export function defaultFhirStorageRoot(projectRoot = process.cwd()) {
  const fromEnv = process.env.INTEGRAMED_FHIR_ROOT;
  if (fromEnv && String(fromEnv).trim()) return path.resolve(String(fromEnv));
  return path.join(projectRoot, "data", "fhir");
}
