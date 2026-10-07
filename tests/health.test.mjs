import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SESSION_SECRET = "s".repeat(48);
const FHIR_PROXY_SECRET = "p".repeat(48);

process.env.SESSION_SECRET = SESSION_SECRET;
process.env.FHIR_PROXY_SECRET = FHIR_PROXY_SECRET;
process.env.FHIR_MODE = "local";
process.env.FHIR_PROXY_NO_LISTEN = "1";
process.env.NODE_ENV = "production";
delete process.env.PORT;
delete process.env.FHIR_PROXY_PORT;

const { app, proxyListenPort } = await import("../server/index.js");

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

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function request(server, method, urlPath, headers = {}) {
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}${urlPath}`, { method, headers });
  const text = await res.text();
  return { status: res.status, text };
}

test("proxy /healthz returns 200 without a session or proxy secret", async () => {
  const server = await listen(app);
  try {
    const open = await request(server, "GET", "/healthz");
    assert.equal(open.status, 200);
    assert.deepEqual(JSON.parse(open.text), { ok: true });

    const fhirStatus = await request(server, "GET", "/api/health");
    assert.equal(fhirStatus.status, 401);
  } finally {
    await stop(server);
  }
});

test("proxy listen port follows FHIR_PROXY_PORT and ignores PORT", () => {
  assert.equal(proxyListenPort({}), 3001);
  assert.equal(proxyListenPort({ PORT: "3000" }), 3001);
  assert.equal(proxyListenPort({ PORT: "3001" }), 3001);
  assert.equal(proxyListenPort({ FHIR_PROXY_PORT: "4010", PORT: "3000" }), 4010);
  assert.equal(proxyListenPort({ FHIR_PROXY_PORT: " 4011 " }), 4011);
  assert.equal(proxyListenPort({ FHIR_PROXY_PORT: "nope" }), null);
  assert.equal(proxyListenPort({ FHIR_PROXY_PORT: "0" }), null);
});

test("spawned proxy serves /healthz on FHIR_PROXY_PORT when PORT is 3000", async () => {
  const proxyPort = await freePort();
  const dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), "integramed-health-fhir-"));
  const authRoot = fs.mkdtempSync(path.join(os.tmpdir(), "integramed-health-auth-"));
  const env = { ...process.env };
  delete env.FHIR_PROXY_NO_LISTEN;
  env.PORT = "3000";
  env.FHIR_PROXY_PORT = String(proxyPort);
  env.FHIR_MODE = "local";
  env.NODE_ENV = "production";
  env.INTEGRAMED_DATA_ROOT = dataRoot;
  env.INTEGRAMED_AUTH_ROOT = authRoot;
  env.SESSION_SECRET = SESSION_SECRET;
  env.FHIR_PROXY_SECRET = FHIR_PROXY_SECRET;

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
    const started = Date.now();
    let body = "";
    let status = 0;
    while (Date.now() - started < 20_000) {
      try {
        const res = await fetch(`http://127.0.0.1:${proxyPort}/healthz`);
        status = res.status;
        body = await res.text();
        if (status === 200) break;
      } catch {
        // proxy still binding
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.equal(status, 200, log);
    assert.deepEqual(JSON.parse(body), { ok: true });
    assert.match(log, new RegExp(`listening on http://127\\.0\\.0\\.1:${proxyPort}`));
    assert.match(log, /PORT=3000 is ignored/);

    const fhir = await fetch(`http://127.0.0.1:${proxyPort}/api/health`);
    assert.equal(fhir.status, 401);
  } finally {
    child.kill("SIGTERM");
    await new Promise((resolve) => child.once("exit", resolve));
    fs.rmSync(dataRoot, { recursive: true, force: true });
    fs.rmSync(authRoot, { recursive: true, force: true });
  }
});

test("Next /healthz is public and checks the proxy without auth", async () => {
  const { isPublicPath } = await import("../src/lib/public-path.ts");
  const { GET } = await import("../src/app/healthz/route.ts");
  const middlewareSource = fs.readFileSync(path.join(repo, "src/middleware.ts"), "utf8");
  assert.match(middlewareSource, /isPublicPath\(pathname\)/);

  assert.equal(isPublicPath("/healthz"), true);
  assert.equal(isPublicPath("/"), false);
  assert.equal(isPublicPath("/api/health"), false);
  assert.equal(isPublicPath("/api/auth"), true);

  const stub = await listen((req, res) => {
    res.writeHead(req.url === "/healthz" ? 200 : 404, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, leaked: "do-not-forward" }));
  });
  const previous = process.env.FHIR_PROXY_URL;
  process.env.FHIR_PROXY_URL = `http://127.0.0.1:${stub.address().port}`;
  try {
    const body = await GET();
    assert.equal(body.status, 200);
    assert.deepEqual(await body.json(), { ok: true });
  } finally {
    await stop(stub);
    if (previous === undefined) delete process.env.FHIR_PROXY_URL;
    else process.env.FHIR_PROXY_URL = previous;
  }

  const down = await GET();
  assert.equal(down.status, 503);
  assert.deepEqual(await down.json(), { ok: false });
});
