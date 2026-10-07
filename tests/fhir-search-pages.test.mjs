import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { signSession } from "../server/sessionAuth.js";
import { withSession } from "../src/lib/session.ts";
import { fhirSearch } from "../src/lib/fhir.ts";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SECRET = `s${"e".repeat(47)}`;
const PROXY_SECRET = `p${"x".repeat(47)}`;

process.env.SESSION_SECRET = SECRET;
process.env.FHIR_PROXY_SECRET = PROXY_SECRET;
process.env.FHIR_MODE = "local";
process.env.INTEGRAMED_ACTION_TEST = "1";
process.env.NODE_ENV = "development";
delete process.env.FHIR_PROXY_NO_LISTEN;

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

test("fhirSearch pages past _count=200 and does not repeat schedules", { timeout: 60_000 }, async () => {
  const dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), "integramed-pages-"));
  const port = await freePort();
  const origin = `http://127.0.0.1:${port}`;
  process.env.FHIR_PROXY_URL = origin;
  process.env.INTEGRAMED_DATA_ROOT = dataRoot;
  process.env.INTEGRAMED_FHIR_ROOT = path.join(dataRoot, "fhir");
  process.env.INTEGRAMED_AUTH_ROOT = path.join(dataRoot, "auth");
  const child = spawn(process.execPath, ["server/index.js"], {
    cwd: repo,
    env: { ...process.env, FHIR_PROXY_PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  child.stderr.on("data", (chunk) => {
    log += chunk.toString();
  });
  child.stdout.on("data", (chunk) => {
    log += chunk.toString();
  });
  const token = signSession(
    { id: "prac-admin", name: "Admin", login: "admin", role: "admin", pwdAt: Date.now() },
    SECRET,
  );
  const headers = {
    cookie: `integramed_session=${token}`,
    "x-integramed-proxy-secret": PROXY_SECRET,
    "content-type": "application/fhir+json",
    accept: "application/fhir+json",
  };
  try {
    const started = Date.now();
    let ready = false;
    while (Date.now() - started < 20_000) {
      try {
        const res = await fetch(`${origin}/api/health`, { headers });
        if (res.status === 200) {
          ready = true;
          break;
        }
      } catch {
        /* proxy still booting */
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.equal(ready, true, log.slice(-1000));

    const total = 201;
    for (let index = 0; index < total; index += 1) {
      const id = `sched-${String(index).padStart(3, "0")}`;
      const res = await fetch(`${origin}/api/fhir/Schedule/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ resourceType: "Schedule", id, active: true }),
      });
      assert.equal(res.status === 200 || res.status === 201, true, `${id} ${res.status}`);
    }

    const first = await fetch(`${origin}/api/fhir/Schedule?_count=200`, { headers });
    const firstBody = await first.json();
    assert.equal(firstBody.entry.length, 200);
    assert.equal(firstBody.total, total);

    const schedules = await withSession(
      { id: "prac-admin", name: "Admin", login: "admin", role: "admin" },
      () => fhirSearch("Schedule", { _count: "200" }),
    );
    const ids = schedules.map((resource) => resource.id);
    assert.equal(ids.length, total);
    assert.equal(new Set(ids).size, total);
  } finally {
    child.kill("SIGTERM");
    await new Promise((resolve) => child.once("exit", resolve));
    fs.rmSync(dataRoot, { recursive: true, force: true });
  }
});
