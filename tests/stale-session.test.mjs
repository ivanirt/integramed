import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { signSession } from "../server/sessionAuth.js";

const SESSION_SECRET = "s".repeat(48);
const FHIR_PROXY_SECRET = "p".repeat(48);

process.env.SESSION_SECRET = SESSION_SECRET;
process.env.FHIR_PROXY_SECRET = FHIR_PROXY_SECRET;
process.env.FHIR_MODE = "local";
process.env.FHIR_PROXY_NO_LISTEN = "1";
process.env.CLINICAL_AI_KEY = "";

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

async function request(server, token) {
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/fhir/metadata`, {
    headers: {
      "x-integramed-proxy-secret": FHIR_PROXY_SECRET,
      cookie: `integramed_session=${token}`,
    },
  });
  return res.status;
}

test("the proxy rejects a session issued before the personal password changed", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "integramed-auth-"));
  fs.mkdirSync(path.join(root, "data", "auth"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "data", "auth", "accounts.json"),
    JSON.stringify({
      accounts: [{ practitionerId: "prac-reset", passwordChangedAt: 500 }],
    }),
  );
  const previous = process.env.INTEGRAMED_AUTH_ROOT;
  process.env.INTEGRAMED_AUTH_ROOT = root;
  const server = await listen(app);
  try {
    const stale = signSession(
      { id: "prac-reset", name: "Ivan", login: "ivanirt@gmail.com", role: "admin", pwdAt: 100 },
      SESSION_SECRET,
    );
    const current = signSession(
      { id: "prac-reset", name: "Ivan", login: "ivanirt@gmail.com", role: "admin", pwdAt: 500 },
      SESSION_SECRET,
    );
    assert.equal(await request(server, stale), 401);
    assert.equal(await request(server, current), 200);
  } finally {
    if (previous === undefined) delete process.env.INTEGRAMED_AUTH_ROOT;
    else process.env.INTEGRAMED_AUTH_ROOT = previous;
    await stop(server);
  }
});
