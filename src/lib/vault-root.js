import fs from "node:fs";
import path from "node:path";

const migrated = new Set();

export function normalizeVaultLanguage(lang) {
  return String(lang || "").toLowerCase().startsWith("en") ? "en" : "es";
}

/** Persistent vault root. Imports, edits, and source settings live here. */
export function vaultStorageRoot(projectRoot = process.cwd()) {
  const fromEnv = process.env.INTEGRAMED_VAULT_ROOT;
  if (fromEnv && String(fromEnv).trim()) return path.resolve(String(fromEnv));
  return path.join(path.resolve(projectRoot), "data", "vault");
}

/** Read-only notes shipped in the image or the checkout. Not a volume. */
export function bundledVaultDir(projectRoot, lang) {
  return path.resolve(projectRoot, `vault-${normalizeVaultLanguage(lang)}`);
}

export function persistentVaultDir(projectRoot, lang) {
  return path.join(vaultStorageRoot(projectRoot), normalizeVaultLanguage(lang));
}

export function explicitVaultPath(lang) {
  const normalized = normalizeVaultLanguage(lang);
  const envKey = normalized === "en" ? "CLINICAL_VAULT_EN_PATH" : "CLINICAL_VAULT_ES_PATH";
  const raw = process.env[envKey];
  if (raw && String(raw).trim()) return path.resolve(String(raw));
  return null;
}

export function vaultSettingsFile(projectRoot) {
  return path.join(vaultStorageRoot(projectRoot), "vault-source-settings.json");
}

export function legacyVaultSettingsFile(projectRoot) {
  return path.join(path.resolve(projectRoot), "data", "vault-source-settings.json");
}

function dirHasEntries(dir) {
  try {
    return fs.readdirSync(dir).length > 0;
  } catch {
    return false;
  }
}

function copyTree(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) copyTree(from, to);
    else if (entry.isFile()) fs.copyFileSync(from, to);
  }
}

/**
 * Non-destructive. Creates the persistent dirs, copies a legacy settings
 * file when the new one is absent, and copies an imported inbox/ tree once
 * when the persistent inbox is still empty. Bundled notes are not copied.
 */
export function migrateVaultStorage(projectRoot = process.cwd()) {
  const root = vaultStorageRoot(projectRoot);
  if (migrated.has(root)) return;
  fs.mkdirSync(path.join(root, "es"), { recursive: true });
  fs.mkdirSync(path.join(root, "en"), { recursive: true });

  const nextSettings = vaultSettingsFile(projectRoot);
  const legacySettings = legacyVaultSettingsFile(projectRoot);
  if (
    !fs.existsSync(nextSettings) &&
    path.resolve(nextSettings) !== path.resolve(legacySettings) &&
    fs.existsSync(legacySettings)
  ) {
    fs.copyFileSync(legacySettings, nextSettings);
  }

  for (const lang of ["es", "en"]) {
    const inboxSrc = path.join(bundledVaultDir(projectRoot, lang), "inbox");
    const inboxDest = path.join(persistentVaultDir(projectRoot, lang), "inbox");
    if (fs.existsSync(inboxSrc) && !dirHasEntries(inboxDest)) copyTree(inboxSrc, inboxDest);
  }
  migrated.add(root);
}

/** Read order: bundled base, then the persistent overlay. An explicit env path is alone. */
export function vaultReadRoots(lang, projectRoot = process.cwd()) {
  const explicit = explicitVaultPath(lang);
  if (explicit) return [explicit];
  const legacy = process.env.CLINICAL_VAULT_PATH;
  if (legacy && String(legacy).trim()) return [path.resolve(String(legacy))];
  const roots = [];
  const bundled = bundledVaultDir(projectRoot, lang);
  const persistent = persistentVaultDir(projectRoot, lang);
  if (fs.existsSync(bundled)) roots.push(bundled);
  if (path.resolve(persistent) !== path.resolve(bundled)) roots.push(persistent);
  return roots;
}

/** Directory that receives imports and copy-on-write edits. */
export function vaultWriteRoot(lang, projectRoot = process.cwd()) {
  const explicit = explicitVaultPath(lang);
  if (explicit) return explicit;
  const legacy = process.env.CLINICAL_VAULT_PATH;
  if (legacy && String(legacy).trim()) return path.resolve(String(legacy));
  migrateVaultStorage(projectRoot);
  return persistentVaultDir(projectRoot, lang);
}
