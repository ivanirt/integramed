import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { signSession } from "../server/sessionAuth.js";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SESSION_SECRET = "s".repeat(48);
const FHIR_PROXY_SECRET = "p".repeat(48);
const fhirRoot = fs.mkdtempSync(path.join(os.tmpdir(), "integramed-fhir-http-"));

process.env.SESSION_SECRET = SESSION_SECRET;
process.env.FHIR_PROXY_SECRET = FHIR_PROXY_SECRET;
process.env.FHIR_MODE = "local";
process.env.FHIR_PROXY_NO_LISTEN = "1";
process.env.INTEGRAMED_FHIR_ROOT = fhirRoot;
const authRoot = fs.mkdtempSync(path.join(os.tmpdir(), "integramed-auth-"));
process.env.INTEGRAMED_AUTH_ROOT = authRoot;
fs.mkdirSync(authRoot, { recursive: true });
fs.writeFileSync(
  path.join(authRoot, "accounts.json"),
  JSON.stringify({
    revision: 1,
    accounts: [{ practitionerId: "prac-1", email: "prac-1@clinic.test", passwordChangedAt: 0, mustChangePassword: false }],
  }),
);
delete process.env.PORT;

const { app } = await import("../server/index.js");

function listen(handler) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(handler);
    server.listen(0, "127.0.0.1", () => resolve(server));
    server.on("error", reject);
  });
}

function stop(server) {
  return new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

function doctor() {
  return signSession({ id: "prac-1", name: "Ivan", login: "ivan", role: "doctor" }, SESSION_SECRET);
}

async function request(server, method, urlPath, { token, secret, body } = {}) {
  const { port } = server.address();
  const headers = {};
  if (secret) headers["x-integramed-proxy-secret"] = secret;
  if (token) headers.cookie = `integramed_session=${token}`;
  if (body !== undefined) headers["content-type"] = "application/json";
  const res = await fetch(`http://127.0.0.1:${port}${urlPath}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, text };
}

test("an unwritable FHIR root returns 500 and the proxy keeps serving", async () => {
  if (typeof process.getuid === "function" && process.getuid() === 0) return;
  const server = await listen(app);
  try {
    const created = await request(server, "POST", "/api/fhir/Patient", {
      token: doctor(),
      secret: FHIR_PROXY_SECRET,
      body: { resourceType: "Patient", id: "pat-ok", active: true },
    });
    assert.equal(created.status, 201);

    fs.chmodSync(path.join(fhirRoot, "Patient"), 0o555);
    fs.chmodSync(fhirRoot, 0o555);
    const failed = await request(server, "POST", "/api/fhir/Patient", {
      token: doctor(),
      secret: FHIR_PROXY_SECRET,
      body: { resourceType: "Patient", id: "pat-denied", active: true },
    });
    assert.equal(failed.status, 500);
    const payload = JSON.parse(failed.text);
    assert.equal(payload.resourceType, "OperationOutcome");
    assert.match(payload.issue[0].diagnostics, /No se pudo completar/);

    const health = await request(server, "GET", "/healthz");
    assert.equal(health.status, 200);
    assert.deepEqual(JSON.parse(health.text), { ok: true });
  } finally {
    fs.chmodSync(fhirRoot, 0o755);
    const patientDir = path.join(fhirRoot, "Patient");
    if (fs.existsSync(patientDir)) fs.chmodSync(patientDir, 0o755);
    await stop(server);
    fs.rmSync(fhirRoot, { recursive: true, force: true });
  }
});

test("the proxy refuses to listen when the local FHIR root is not writable", async () => {
  if (typeof process.getuid === "function" && process.getuid() === 0) return;
  const readonly = fs.mkdtempSync(path.join(os.tmpdir(), "integramed-fhir-boot-"));
  fs.chmodSync(readonly, 0o555);
  const env = { ...process.env };
  delete env.FHIR_PROXY_NO_LISTEN;
  env.FHIR_MODE = "local";
  env.INTEGRAMED_FHIR_ROOT = readonly;
  env.SESSION_SECRET = SESSION_SECRET;
  env.FHIR_PROXY_SECRET = FHIR_PROXY_SECRET;
  delete env.FHIR_PROXY_PORT;
  const child = spawn(process.execPath, ["server/index.js"], {
    cwd: repo,
    env,
    stdio: ["ignore", "pipe", "pipe"],
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
      const timer = setTimeout(() => reject(new Error(`proxy stayed up\n${log}`)), 8000);
      child.once("exit", (status) => {
        clearTimeout(timer);
        resolve(status);
      });
    });
    assert.equal(code, 1);
    assert.match(log, /uid 1001/);
    assert.match(log, /chown -R 1001:1001/);
    assert.doesNotMatch(log, /listening on/);
  } finally {
    if (child.exitCode === null) child.kill("SIGKILL");
    fs.chmodSync(readonly, 0o755);
    fs.rmSync(readonly, { recursive: true, force: true });
  }
});
