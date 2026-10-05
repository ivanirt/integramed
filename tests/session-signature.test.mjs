import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { isAcceptableSecret, verifySessionToken } from "../src/lib/session-edge.ts";
import { signSession, verifySessionToken as verifyNode } from "../server/sessionAuth.js";

const SECRET = "s".repeat(48);

function user(exp = Date.now() + 60_000) {
  return { id: "prac-1", name: "Ivan", login: "ivan", role: "doctor", exp };
}

test("rejects the example secret and short secrets", () => {
  assert.equal(isAcceptableSecret(""), false);
  assert.equal(isAcceptableSecret("integramed-dev-session-secret"), false);
  assert.equal(isAcceptableSecret("x".repeat(31)), false);
  assert.equal(isAcceptableSecret(SECRET), true);
});

test("edge and node verifiers accept a signed session and reject forgeries", async () => {
  const token = signSession(user(), SECRET);
  const edge = await verifySessionToken(token, SECRET);
  const node = verifyNode(token, SECRET);
  assert.equal(edge?.id, "prac-1");
  assert.equal(edge?.role, "doctor");
  assert.equal(node?.login, "ivan");

  const forged = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;
  assert.equal(await verifySessionToken(forged, SECRET), null);
  assert.equal(verifyNode(forged, SECRET), null);
  assert.equal(await verifySessionToken(token, "t".repeat(48)), null);
  assert.equal(await verifySessionToken(token, "integramed-dev-session-secret"), null);
});

test("rejects expired tokens and unknown roles", async () => {
  const expired = signSession(user(Date.now() - 1000), SECRET);
  assert.equal(await verifySessionToken(expired, SECRET), null);
  const payload = Buffer.from(
    JSON.stringify({ id: "prac-1", name: "Ivan", login: "ivan", role: "superadmin", exp: Date.now() + 60_000 }),
  ).toString("base64url");
  const signature = createHmac("sha256", SECRET).update(payload).digest("base64url");
  assert.equal(await verifySessionToken(`${payload}.${signature}`, SECRET), null);
});
