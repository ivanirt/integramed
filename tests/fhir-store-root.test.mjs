import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createLocalFhirStore } from "../server/localFhir.js";
import { defaultFhirStorageRoot } from "../src/lib/fhir-root.js";
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
