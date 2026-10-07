import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { applyAutoLinks } from "../server/vaultCatalog.js";
import { loadLanguageVaultNotes, resolveVaultPath } from "../server/clinicalVault.js";
import { importVaultDocuments } from "../server/vaultImport.js";
import { loadVaultSourceSettings, saveVaultSourceSettings } from "../server/vaultSettings.js";

function withVaultEnv(values, fn) {
  const keys = ["INTEGRAMED_VAULT_ROOT", "CLINICAL_VAULT_ES_PATH", "CLINICAL_VAULT_EN_PATH", "CLINICAL_VAULT_PATH"];
  const previous = new Map(keys.map((key) => [key, process.env[key]]));
  for (const key of keys) delete process.env[key];
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return fn();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("bundled notes stay readable and imports land in the persistent vault", () => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "integramed-project-"));
  const persistent = fs.mkdtempSync(path.join(os.tmpdir(), "integramed-vault-root-"));
  const bundled = path.join(project, "vault-es");
  fs.mkdirSync(bundled, { recursive: true });
  fs.writeFileSync(path.join(bundled, "nota.md"), "# Nota\n\nDolor lumbar\n");
  fs.mkdirSync(path.join(bundled, "inbox", "files"), { recursive: true });
  fs.writeFileSync(path.join(bundled, "inbox", "files", "vieja.md"), "# Vieja\n\nImportada antes\n");
  fs.mkdirSync(path.join(project, "data"), { recursive: true });
  fs.writeFileSync(
    path.join(project, "data", "vault-source-settings.json"),
    `${JSON.stringify({ es: { disabled: ["src-old"] }, en: { disabled: [] } }, null, 2)}\n`,
  );

  withVaultEnv({ INTEGRAMED_VAULT_ROOT: persistent }, () => {
    const notes = loadLanguageVaultNotes("es", project);
    const files = notes.map((note) => note.file).sort();
    assert.deepEqual(files, ["inbox/files/vieja.md", "nota.md"]);
    assert.equal(fs.existsSync(path.join(persistent, "vault-source-settings.json")), true);
    assert.deepEqual(loadVaultSourceSettings(project).es.disabled, ["src-old"]);
    assert.equal(fs.existsSync(path.join(project, "data", "vault-source-settings.json")), true);

    const writePath = resolveVaultPath("es", project);
    assert.equal(writePath, path.join(persistent, "es"));
    const imported = importVaultDocuments(writePath, {
      sourceKind: "file",
      title: "Nota nueva",
      content: "Texto importado ahora",
    });
    assert.equal(imported.files.length, 1);
    assert.equal(fs.existsSync(path.join(writePath, imported.files[0])), true);
    assert.equal(fs.existsSync(path.join(bundled, imported.files[0])), false);

    const edited = applyAutoLinks(
      writePath,
      notes,
      [{ file: "nota.md", phrase: "Dolor lumbar", target: "Otra" }],
      [bundled],
    );
    assert.deepEqual(edited.written, ["nota.md"]);
    assert.match(fs.readFileSync(path.join(writePath, "nota.md"), "utf8"), /\[\[Otra\|Dolor lumbar\]\]/);
    assert.doesNotMatch(fs.readFileSync(path.join(bundled, "nota.md"), "utf8"), /\[\[/);

    const again = loadLanguageVaultNotes("es", project);
    const overlay = again.find((note) => note.file === "nota.md");
    assert.match(overlay.body, /\[\[Otra\|Dolor lumbar\]\]/);
  });

  fs.rmSync(project, { recursive: true, force: true });
  fs.rmSync(persistent, { recursive: true, force: true });
});

test("an explicit vault path does not read the bundled tree", () => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "integramed-project-"));
  const only = fs.mkdtempSync(path.join(os.tmpdir(), "integramed-explicit-"));
  fs.mkdirSync(path.join(project, "vault-es"), { recursive: true });
  fs.writeFileSync(path.join(project, "vault-es", "base.md"), "# Base\n");
  fs.writeFileSync(path.join(only, "solo.md"), "# Solo\n");
  withVaultEnv({ CLINICAL_VAULT_ES_PATH: only }, () => {
    const notes = loadLanguageVaultNotes("es", project);
    assert.deepEqual(notes.map((note) => note.file), ["solo.md"]);
    assert.equal(resolveVaultPath("es", project), path.resolve(only));
    saveVaultSourceSettings(project, { es: { disabled: [] }, en: { disabled: ["x"] } });
  });
  fs.rmSync(project, { recursive: true, force: true });
  fs.rmSync(only, { recursive: true, force: true });
});
