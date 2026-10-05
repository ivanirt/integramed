import path from "node:path";

/**
 * Directory that contains accounts.json.
 * INTEGRAMED_AUTH_ROOT overrides the default <repo>/data/auth.
 */
export function defaultAuthStorageRoot(repoRoot = process.cwd()) {
  const fromEnv = process.env.INTEGRAMED_AUTH_ROOT;
  if (fromEnv && String(fromEnv).trim()) return path.resolve(String(fromEnv));
  return path.join(repoRoot, "data", "auth");
}

export function authStorageRoot(explicit) {
  if (explicit !== undefined && explicit !== null && String(explicit).trim() !== "") {
    return path.resolve(String(explicit));
  }
  return defaultAuthStorageRoot();
}

export function accountsFile(explicit) {
  return path.join(authStorageRoot(explicit), "accounts.json");
}
