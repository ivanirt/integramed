import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createLocalFhirHandler, createLocalFhirStore } from "../server/localFhir.js";
import { assertFhirRootWritable, defaultFhirStorageRoot } from "../src/lib/fhir-root.js";
import {
  logAccountsMissingFromStore,
  logMissingPractitionerOnLogin,
  missingPractitionerMessage,
} from "../src/lib/missing-practitioner.js";

test("INTEGRAMED_FHIR_ROOT selects the local FHIR directory and otherwise stays data/fhir", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "integramed-fhir-"));
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "integramed-fhir-default-"));
  const previous = process.env.INTEGRAMED_FHIR_ROOT;
  try {
    process.env.INTEGRAMED_FHIR_ROOT = dir;
    assert.equal(defaultFhirStorageRoot("/unused"), dir);
    const overridden = createLocalFhirStore("/unused");
    overridden.writeResource({ resourceType: "Practitioner", id: "p1", active: true });
    assert.equal(fs.existsSync(path.join(dir, "Practitioner", "p1.json")), true);

    delete process.env.INTEGRAMED_FHIR_ROOT;
    assert.equal(defaultFhirStorageRoot(root), path.join(root, "data", "fhir"));
    const store = createLocalFhirStore(root);
    store.writeResource({ resourceType: "Patient", id: "pt1" });
    assert.equal(fs.existsSync(path.join(root, "data", "fhir", "Patient", "pt1.json")), true);
  } finally {
    if (previous === undefined) delete process.env.INTEGRAMED_FHIR_ROOT;
    else process.env.INTEGRAMED_FHIR_ROOT = previous;
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a local FHIR root that exists but is not writable fails with the chown hint", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "integramed-fhir-ok-"));
  assert.doesNotThrow(() => assertFhirRootWritable(dir));
  fs.rmSync(dir, { recursive: true, force: true });

  if (typeof process.getuid === "function" && process.getuid() === 0) return;
  const readonly = fs.mkdtempSync(path.join(os.tmpdir(), "integramed-fhir-ro-"));
  fs.chmodSync(readonly, 0o555);
  try {
    assert.throws(() => assertFhirRootWritable(readonly), /uid 1001/);
    assert.throws(() => assertFhirRootWritable(readonly), /chown -R 1001:1001/);
  } finally {
    fs.chmodSync(readonly, 0o755);
    fs.rmSync(readonly, { recursive: true, force: true });
  }
});

test("a local FHIR write error is a 500 OperationOutcome and does not throw", () => {
  if (typeof process.getuid === "function" && process.getuid() === 0) return;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "integramed-fhir-handler-"));
  const previous = process.env.INTEGRAMED_FHIR_ROOT;
  process.env.INTEGRAMED_FHIR_ROOT = root;
  try {
    const handler = createLocalFhirHandler(root);
    fs.chmodSync(root, 0o555);
    let result;
    assert.doesNotThrow(() => {
      result = handler.handleFhirRequest("POST", "/Patient", {}, {
        resourceType: "Patient",
        name: [{ family: "Prueba" }],
      });
    });
    assert.equal(result.status, 500);
    assert.equal(result.body.resourceType, "OperationOutcome");
    assert.match(result.body.issue[0].diagnostics, /No se pudo completar/);
  } finally {
    fs.chmodSync(root, 0o755);
    if (previous === undefined) delete process.env.INTEGRAMED_FHIR_ROOT;
    else process.env.INTEGRAMED_FHIR_ROOT = previous;
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a missing Practitioner is logged and the login message does not include a password", () => {
  const lines = [];
  const log = (line) => lines.push(line);
  const accounts = [{ practitionerId: "prac-1", email: "staff@clinic.test" }];
  assert.equal(logAccountsMissingFromStore(accounts, ["prac-1"], log), 0);
  assert.equal(lines.length, 0);
  assert.equal(logAccountsMissingFromStore(accounts, [], log), 1);
  assert.match(lines[0], /staff@clinic\.test/);
  assert.match(lines[0], /Practitioner prac-1/);
  assert.match(lines[0], /\/app\/data\/fhir/);
  assert.equal(lines[0].includes("SET_PASSWORD"), false);
  assert.equal(logMissingPractitionerOnLogin("other@clinic.test", accounts, log), false);
  assert.equal(logMissingPractitionerOnLogin("staff@clinic.test", accounts, log), true);
  assert.equal(lines.length, 2);
  const route = fs.readFileSync("src/app/api/auth/route.ts", "utf8");
  assert.match(route, /logMissingPractitionerOnLogin/);
  assert.match(route, /LOGIN_ERROR/);
  assert.match(missingPractitionerMessage(accounts[0]), /401/);
});
