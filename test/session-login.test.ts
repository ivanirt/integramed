import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { isSessionPasswordCurrent } from "../src/lib/session-stamp.js";
import { verifySessionToken } from "../src/lib/session-edge.ts";
import { buildSessionToken } from "../src/lib/session-token.ts";
import { signSession, verifySessionToken as verifyNode } from "../server/sessionAuth.js";

const SECRET = "s".repeat(48);

test("personal-password sessions verify in middleware and the proxy, including pwdAt", async () => {
  const exp = Date.now() + 60_000;
  const token = buildSessionToken(
    { id: "prac-ivan", name: "Ivan Renteria", login: "ivanirt@gmail.com", role: "admin", pwdAt: 80, exp },
    SECRET,
  );
  const edge = await verifySessionToken(token, SECRET);
  const node = verifyNode(token, SECRET);
  assert.equal(edge?.id, "prac-ivan");
  assert.equal(edge?.role, "admin");
  assert.equal(node?.role, "admin");
  assert.equal(node?.pwdAt, 80);

  const fromProxy = signSession(
    { id: "prac-ivan", name: "Ivan Renteria", login: "ivanirt@gmail.com", role: "doctor", pwdAt: 80, exp },
    SECRET,
  );
  assert.equal((await verifySessionToken(fromProxy, SECRET))?.role, "doctor");
  assert.equal(verifyNode(fromProxy, SECRET)?.pwdAt, 80);
});

test("signed sessions reject unknown roles and the old example secret", async () => {
  const exp = Date.now() + 60_000;
  const token = buildSessionToken(
    { id: "prac-ivan", name: "Ivan", login: "ivan", role: "owner", pwdAt: 0, exp },
    SECRET,
  );
  assert.equal(await verifySessionToken(token, SECRET), null);
  assert.equal(verifyNode(token, SECRET), null);

  const issued = buildSessionToken(
    { id: "prac-ivan", name: "Ivan", login: "ivan", role: "admin", pwdAt: 1, exp },
    "integramed-dev-session-secret",
  );
  assert.equal(await verifySessionToken(issued, "integramed-dev-session-secret"), null);
  assert.equal(verifyNode(issued, "integramed-dev-session-secret"), null);
});

test("a password change invalidates cookies issued before it", () => {
  const accounts = [{ practitionerId: "prac-ivan", passwordChangedAt: 100 }];
  assert.equal(isSessionPasswordCurrent({ id: "prac-ivan", pwdAt: 100 }, accounts), true);
  assert.equal(isSessionPasswordCurrent({ id: "prac-ivan", pwdAt: 99 }, accounts), false);
  assert.equal(isSessionPasswordCurrent({ id: "prac-ivan" }, accounts), false);
  assert.equal(isSessionPasswordCurrent({ id: "someone-else", pwdAt: 0 }, accounts), false);
  assert.equal(isSessionPasswordCurrent({ id: "seed-yeshua", pwdAt: 0 }, accounts), true);
});

test("login and session sources do not restore a shared password or the example secret", () => {
  const files = [
    "src/app/api/auth/route.ts",
    "src/lib/session.ts",
    "src/lib/password-reset.ts",
    "src/lib/mailer.ts",
    ".env.example",
    "src/app/acceso/page.tsx",
  ];
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    assert.equal(text.includes("IntegraMed27"), false, file);
    assert.equal(text.includes("integramed-dev-session-secret"), false, file);
    assert.equal(text.includes("CLINIC_MASTER_PASSWORD"), false, file);
  }
});
