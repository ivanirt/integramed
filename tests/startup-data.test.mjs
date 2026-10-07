import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { collectDataRootProblems } from "../src/lib/startup-data.js";

const script = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../scripts/supervise.mjs");
const root = process.getuid?.() !== 0;

function withEnv(values, fn) {
  const previous = new Map();
  for (const [key, value] of Object.entries(values)) {
    previous.set(key, process.env[key]);
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

test("preflight reports auth and FHIR together when both roots are not writable", () => {
  if (!root) return;
  const auth = fs.mkdtempSync(path.join(os.tmpdir(), "integramed-auth-ro-"));
  const fhir = fs.mkdtempSync(path.join(os.tmpdir(), "integramed-fhir-ro-"));
  fs.chmodSync(auth, 0o555);
  fs.chmodSync(fhir, 0o555);
  try {
    const problems = withEnv(
      { INTEGRAMED_AUTH_ROOT: auth, INTEGRAMED_FHIR_ROOT: fhir, FHIR_MODE: "local" },
      () => collectDataRootProblems(),
    );
    assert.equal(problems.length, 2);
    assert.match(problems[0], /directorio de credenciales/);
    assert.match(problems[0], /uid 1001/);
    assert.match(problems[0], /chown -R 1001:1001/);
    assert.match(problems[1], /directorio FHIR/);
    assert.match(problems[1], /chown -R 1001:1001/);
  } finally {
    fs.chmodSync(auth, 0o755);
    fs.chmodSync(fhir, 0o755);
    fs.rmSync(auth, { recursive: true, force: true });
    fs.rmSync(fhir, { recursive: true, force: true });
  }
});

test("preflight skips the FHIR root unless FHIR_MODE is local", () => {
  if (!root) return;
  const auth = fs.mkdtempSync(path.join(os.tmpdir(), "integramed-auth-ro-"));
  const fhir = fs.mkdtempSync(path.join(os.tmpdir(), "integramed-fhir-ro-"));
  fs.chmodSync(auth, 0o555);
  fs.chmodSync(fhir, 0o555);
  try {
    const problems = withEnv(
      { INTEGRAMED_AUTH_ROOT: auth, INTEGRAMED_FHIR_ROOT: fhir, FHIR_MODE: undefined },
      () => collectDataRootProblems(),
    );
    assert.equal(problems.length, 1);
    assert.match(problems[0], /directorio de credenciales/);
    assert.doesNotMatch(problems[0], /FHIR/);
  } finally {
    fs.chmodSync(auth, 0o755);
    fs.chmodSync(fhir, 0o755);
    fs.rmSync(auth, { recursive: true, force: true });
    fs.rmSync(fhir, { recursive: true, force: true });
  }
});

test("the supervisor prints every data-root problem and does not start children", async () => {
  if (!root) return;
  const auth = fs.mkdtempSync(path.join(os.tmpdir(), "integramed-auth-ro-"));
  const fhir = fs.mkdtempSync(path.join(os.tmpdir(), "integramed-fhir-ro-"));
  fs.chmodSync(auth, 0o555);
  fs.chmodSync(fhir, 0o555);
  const child = spawn(process.execPath, [script], {
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      INTEGRAMED_AUTH_ROOT: auth,
      INTEGRAMED_FHIR_ROOT: fhir,
      FHIR_MODE: "local",
    },
  });
  let log = "";
  child.stdout.on("data", (chunk) => {
    log += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    log += chunk.toString();
  });
  try {
    const code = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        reject(new Error(`supervisor stayed up\n${log}`));
      }, 8000);
      child.once("exit", (status) => {
        clearTimeout(timer);
        resolve(status);
      });
    });
    assert.equal(code, 1);
    assert.match(log, /directorio de credenciales/);
    assert.match(log, /directorio FHIR/);
    assert.match(log, /chown -R 1001:1001/);
    assert.doesNotMatch(log, /listening on/);
    assert.doesNotMatch(log, /Ready/);
  } finally {
    fs.chmodSync(auth, 0o755);
    fs.chmodSync(fhir, 0o755);
    fs.rmSync(auth, { recursive: true, force: true });
    fs.rmSync(fhir, { recursive: true, force: true });
  }
});
