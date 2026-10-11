import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { resolveInsideVault } from "../server/vaultPath.js";
import { applyAutoLinks } from "../server/vaultCatalog.js";

function makeVault() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "integramed-vault-"));
  fs.writeFileSync(path.join(root, "nota.md"), "# Nota\n\nDolor lumbar\n");
  return root;
}

test("accepts a note inside the vault and rejects traversal", () => {
  const root = makeVault();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "integramed-out-"));
  fs.writeFileSync(path.join(outside, "secret.md"), "secret");
  const ok = resolveInsideVault(root, "nota.md");
  assert.equal(ok.relative, "nota.md");
  assert.equal(fs.readFileSync(ok.abs, "utf8").includes("Dolor"), true);

  for (const bad of [
    "../secret.md",
    "..\\secret.md",
    "/etc/passwd",
    "C:/Windows/win.ini",
    "nota.md/../../secret.md",
    "%2e%2e/secret.md",
    "foo/../../../etc/passwd",
    "",
    "nota\0.md",
  ]) {
    assert.throws(() => resolveInsideVault(root, bad), /no válida/);
  }
  assert.equal(fs.existsSync(path.join(outside, "secret.md")), true);
});

test("rejects a symlink that escapes the vault", () => {
  const root = makeVault();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "integramed-out-"));
  const secret = path.join(outside, "secret.md");
  fs.writeFileSync(secret, "secret");
  fs.symlinkSync(secret, path.join(root, "escape.md"));
  assert.throws(() => resolveInsideVault(root, "escape.md"), /no válida/);
});

test("applyAutoLinks does not write outside the vault", () => {
  const root = makeVault();
  const outside = path.join(os.tmpdir(), `integramed-pwn-${process.pid}.md`);
  fs.rmSync(outside, { force: true });
  assert.throws(
    () =>
      applyAutoLinks(root, [{ file: "nota.md" }], [
        { file: "../../" + path.basename(outside), phrase: "Dolor lumbar", target: "otra" },
      ]),
    /no válida/,
  );
  assert.equal(fs.existsSync(outside), false);
  assert.equal(fs.readFileSync(path.join(root, "nota.md"), "utf8").includes("[["), false);
});
