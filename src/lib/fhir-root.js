import path from "node:path";
import { probeWritable } from "./writable-root.js";

/**
 * Directory that contains the local FHIR JSON files (Practitioner/, Patient/, …).
 * INTEGRAMED_FHIR_ROOT overrides the default <project>/data/fhir.
 */
export function defaultFhirStorageRoot(projectRoot = process.cwd()) {
  const fromEnv = process.env.INTEGRAMED_FHIR_ROOT;
  if (fromEnv && String(fromEnv).trim()) return path.resolve(String(fromEnv));
  return path.join(projectRoot, "data", "fhir");
}

/**
 * Fail before listen when the local store cannot be written.
 * A root-owned migrated volume exists but rejects writes from uid 1001.
 */
export function assertFhirRootWritable(root = defaultFhirStorageRoot()) {
  const result = probeWritable(root);
  if (result.ok) return;
  throw new Error(
    `El directorio FHIR no se puede escribir (${result.dir}). El proceso corre como uid 1001. Si el directorio no existe, monta un volumen en INTEGRAMED_FHIR_ROOT. Si ya existe y viene de una imagen root: chown -R 1001:1001 ${result.dir}`,
  );
}
