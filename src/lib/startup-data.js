import { defaultAuthStorageRoot } from "./auth-root.js";
import { assertFhirRootWritable } from "./fhir-root.js";
import { probeWritable } from "./writable-root.js";

/** Spanish auth-root failure, or null when the directory can be written. */
export function authRootProblem(root = defaultAuthStorageRoot()) {
  const result = probeWritable(root);
  if (result.ok) return null;
  const hint = result.exists
    ? `El proceso corre como uid 1001. En un volumen migrado: chown -R 1001:1001 ${result.dir}`
    : "Monta un volumen persistente en INTEGRAMED_AUTH_ROOT.";
  return `El directorio de credenciales no se puede escribir (${result.dir}). ${hint}`;
}

/**
 * Problems that should stop production startup. Auth is always checked.
 * The FHIR root is checked only in local mode, matching the proxy.
 * Both are collected so one failure does not hide the other.
 * @returns {string[]}
 */
export function collectDataRootProblems() {
  const problems = [];
  const auth = authRootProblem();
  if (auth) problems.push(auth);
  if (process.env.FHIR_MODE === "local") {
    try {
      assertFhirRootWritable();
    } catch (error) {
      problems.push(error instanceof Error ? error.message : String(error));
    }
  }
  return problems;
}
