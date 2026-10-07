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

function writeAccounts(root, accounts) {
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(path.join(root, "accounts.json"), JSON.stringify({ revision: 1, accounts }));
}

async function request(server, token, target = "/api/fhir/Patient") {
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}${target}`, {
    headers: {
      "x-integramed-proxy-secret": FHIR_PROXY_SECRET,
      cookie: `integramed_session=${token}`,
    },
  });
  const text = await res.text();
  return { status: res.status, text };
}

function token(pwdAt, mustChange) {
  return signSession(
    {
      id: "prac-temp",
      name: "Admin",
      login: "admin@clinic.test",
      role: "admin",
      pwdAt,
      ...(mustChange === undefined ? {} : { mustChange }),
    },
    SESSION_SECRET,
  );
}

test("the proxy blocks every clinical call while mustChangePassword is set", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "integramed-auth-"));
  const previous = process.env.INTEGRAMED_AUTH_ROOT;
  process.env.INTEGRAMED_AUTH_ROOT = root;
  writeAccounts(root, [{ practitionerId: "prac-temp", passwordChangedAt: 500, mustChangePassword: true }]);
  const server = await listen(app);
  try {
    const blocked = await request(server, token(500, false));
    assert.equal(blocked.status, 403);
    assert.deepEqual(JSON.parse(blocked.text), { error: "Debes cambiar tu contraseña." });
    assert.equal(blocked.text.includes("resourceType"), false);

    const claimed = await request(server, token(500));
    assert.equal(claimed.status, 403);
    assert.equal(claimed.text.includes("resourceType"), false);

    const metadata = await request(server, token(500, true), "/fhir/metadata");
    assert.equal(metadata.status, 403);
    assert.equal(metadata.text.includes("resourceType"), false);

    const consult = await request(server, token(500, false), "/api/ai/consult");
    assert.equal(consult.status, 403);
    assert.deepEqual(Object.keys(JSON.parse(consult.text)), ["error"]);

    const { port } = server.address();
    const health = await fetch(`http://127.0.0.1:${port}/healthz`, {
      headers: { cookie: `integramed_session=${token(500, true)}` },
    });
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { ok: true });
    const bare = await fetch(`http://127.0.0.1:${port}/healthz`);
    assert.equal(bare.status, 200);
    assert.deepEqual(await bare.json(), { ok: true });

    writeAccounts(root, [{ practitionerId: "prac-temp", passwordChangedAt: 900, mustChangePassword: false }]);
    const stale = await request(server, token(500, true));
    assert.equal(stale.status, 401);
    assert.equal(stale.text.includes("resourceType"), false);

    const current = await request(server, token(900, true));
    assert.equal(current.status, 200);

    writeAccounts(root, [{ practitionerId: "prac-temp", passwordChangedAt: 900, mustChangePassword: true }]);
    fs.writeFileSync(path.join(root, "accounts.json"), "{");
    const unreadable = await request(server, token(900, false));
    assert.equal(unreadable.status, 401);
    assert.equal(unreadable.text.includes("resourceType"), false);

    writeAccounts(root, [
      { practitionerId: "prac-old", email: "admin@clinic.test", passwordChangedAt: 500, mustChangePassword: true },
    ]);
    const emailOnly = signSession(
      {
        id: "prac-new",
        name: "Admin",
        login: "admin@clinic.test",
        role: "admin",
        pwdAt: 900,
        mustChange: false,
      },
      SESSION_SECRET,
    );
    const relinked = await request(server, emailOnly);
    assert.equal(relinked.status, 401);
    assert.equal(relinked.text.includes("resourceType"), false);
    const emailOnlyHealth = await fetch(`http://127.0.0.1:${server.address().port}/healthz`, {
      headers: { cookie: `integramed_session=${emailOnly}` },
    });
    assert.equal(emailOnlyHealth.status, 200);
    assert.deepEqual(await emailOnlyHealth.json(), { ok: true });
  } finally {
    if (previous === undefined) delete process.env.INTEGRAMED_AUTH_ROOT;
    else process.env.INTEGRAMED_AUTH_ROOT = previous;
    await stop(server);
  }
});
