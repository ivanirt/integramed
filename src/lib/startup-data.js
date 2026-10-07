import fs from "node:fs";
import path from "node:path";
import { accountsFile, defaultAuthStorageRoot } from "./auth-root.js";
import { fhirModeIsLocal } from "./fhir-mode.js";
import { assertFhirRootWritable } from "./fhir-root.js";
import { vaultStorageRoot } from "./vault-root.js";
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
 * accounts.json mode 0600 owned by root is not a missing file: login then
 * answers "Contraseña incorrecta." because the read fails closed. Say so here.
 * @returns {string | null}
 */
export function accountsFileProblem(root = defaultAuthStorageRoot()) {
  const file = accountsFile(root);
  try {
    fs.accessSync(file, fs.constants.R_OK);
    return null;
  } catch (error) {
    if (!error || (error.code !== "EACCES" && error.code !== "EPERM")) return null;
    const dir = path.dirname(file);
    return `accounts.json no se puede leer (${file}). El proceso corre como uid 1001. En un volumen migrado: chown -R 1001:1001 ${dir}`;
  }
}

/** @returns {string | null} */
export function vaultRootProblem(root = vaultStorageRoot()) {
  const result = probeWritable(root);
  if (result.ok) return null;
  const hint = result.exists
    ? `El proceso corre como uid 1001. En un volumen migrado: chown -R 1001:1001 ${result.dir}`
    : "Monta un volumen persistente en INTEGRAMED_VAULT_ROOT.";
  return `El directorio de la bóveda no se puede escribir (${result.dir}). ${hint}`;
}

/**
 * Problems that should stop production startup. Auth, accounts.json, and the
 * vault root are always checked. The FHIR root is checked only in local mode,
 * matching the proxy. Case and surrounding space in FHIR_MODE do not matter.
 * @returns {string[]}
 */
export function collectDataRootProblems() {
  const problems = [];
  const auth = authRootProblem();
  if (auth) problems.push(auth);
  else {
    const accounts = accountsFileProblem();
    if (accounts) problems.push(accounts);
  }
  const vault = vaultRootProblem();
  if (vault) problems.push(vault);
  if (fhirModeIsLocal()) {
    try {
      assertFhirRootWritable();
    } catch (error) {
      problems.push(error instanceof Error ? error.message : String(error));
    }
  }
  return problems;
}
