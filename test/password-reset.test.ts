import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { randomBytes } from "node:crypto";
import {
  assertAuthRootWritable,
  blankAccount,
  credentialFile,
  mutateAccounts,
  pinnedAccountEmail,
  readAccounts,
  storeResetOnPinnedAccount,
  writeAccounts,
} from "../src/lib/credentials.ts";
import { checkLoginPassword, hashPassword } from "../src/lib/passwords.ts";
import {
  RESET_TTL_MS,
  findResetAccount,
  generateResetToken,
  hashResetToken,
  issueReset,
  authorizeLogin,
  loginStrategy,
  rateLimitAllow,
  validateNewPassword,
  verifyResetToken,
} from "../src/lib/password-reset.ts";

test("reset tokens are random, url-safe, and stored only as a hash", () => {
  const first = generateResetToken();
  const second = generateResetToken();
  assert.notEqual(first, second);
  assert.match(first, /^[A-Za-z0-9_-]+$/);
  assert.ok(first.length >= 43);
  const issued = issueReset(1_000);
  assert.equal(issued.record.tokenHash, hashResetToken(issued.token));
  assert.notEqual(issued.record.tokenHash, issued.token);
  assert.equal(issued.record.tokenHash?.length, 64);
  assert.equal(issued.record.expiresAt, 1_000 + RESET_TTL_MS);
});

test("a token is accepted once, rejected when wrong, expired, or replaced", () => {
  const issued = issueReset(5_000);
  assert.equal(verifyResetToken(issued.record, issued.token, 5_000), "ok");
  assert.equal(verifyResetToken(issued.record, issued.token, issued.record.expiresAt! - 1), "ok");
  assert.equal(verifyResetToken(issued.record, issued.token, issued.record.expiresAt!), "expired");
  assert.equal(verifyResetToken(issued.record, generateResetToken(), 5_000), "invalid");
  assert.equal(verifyResetToken({ tokenHash: null, expiresAt: null }, issued.token, 5_000), "invalid");

  const replacement = issueReset(6_000);
  assert.equal(verifyResetToken(replacement.record, issued.token, 6_000), "invalid");
  assert.equal(verifyResetToken(replacement.record, replacement.token, 6_000), "ok");

  const accounts = [
    {
      resetTokenHash: issued.record.tokenHash,
      resetExpiresAt: issued.record.expiresAt,
    },
  ];
  const found = findResetAccount(accounts, issued.token, 5_000);
  assert.equal(found.status, "ok");
  accounts[found.index] = { resetTokenHash: null, resetExpiresAt: null };
  assert.equal(findResetAccount(accounts, issued.token, 5_000).status, "invalid");
});

test("expired tokens are not confused with unknown tokens", () => {
  const issued = issueReset(0);
  const accounts = [{ resetTokenHash: issued.record.tokenHash, resetExpiresAt: issued.record.expiresAt }];
  assert.equal(findResetAccount(accounts, issued.token, issued.record.expiresAt!).status, "expired");
  assert.equal(findResetAccount(accounts, "otro-token", issued.record.expiresAt!).status, "invalid");
});

test("password rules require length, a letter, a number, and confirmation", () => {
  assert.equal(validateNewPassword("clave123", "clave123"), null);
  assert.equal(validateNewPassword("clave123", "clave124"), "Las contraseñas no coinciden.");
  assert.match(validateNewPassword("abc1", "abc1") || "", /8 caracteres/);
  assert.match(validateNewPassword("sololetras", "sololetras") || "", /letra y un número/);
  assert.match(validateNewPassword("12345678", "12345678") || "", /letra y un número/);
  const long = `ñ1${"ñ".repeat(40)}`;
  assert.match(validateNewPassword(long, long) || "", /demasiado larga/);
});

test("reset requests are rate limited per key and window", () => {
  const buckets = new Map<string, number[]>();
  const start = 1_000_000;
  for (let i = 0; i < 5; i += 1) {
    assert.equal(rateLimitAllow(buckets, "ivanirt@gmail.com", start + i, 5, 1_000), true);
  }
  assert.equal(rateLimitAllow(buckets, "ivanirt@gmail.com", start + 5, 5, 1_000), false);
  assert.equal(rateLimitAllow(buckets, "otra@gmail.com", start + 5, 5, 1_000), true);
  assert.equal(rateLimitAllow(buckets, "ivanirt@gmail.com", start + 1_001, 5, 1_000), true);
});

test("login uses a personal hash and never falls back to a shared clinic password", () => {
  assert.equal(loginStrategy(null), "unset");
  assert.equal(loginStrategy({ passwordHash: null, passwordRequired: false }), "unset");
  assert.equal(loginStrategy({ passwordHash: null, passwordRequired: true }), "unset");
  assert.equal(loginStrategy({ passwordHash: "$2a$12$hash", passwordRequired: true }), "hash");

  assert.deepEqual(authorizeLogin({ account: null, hashMatches: false }), { ok: false, reason: "unset" });
  assert.deepEqual(
    authorizeLogin({ account: { passwordHash: null, passwordRequired: true }, hashMatches: false }),
    { ok: false, reason: "unset" },
  );
  assert.deepEqual(
    authorizeLogin({ account: { passwordHash: null, passwordRequired: false }, hashMatches: true }),
    { ok: false, reason: "unset" },
  );
  assert.deepEqual(
    authorizeLogin({
      account: { passwordHash: "$2a$12$hash", passwordRequired: true, passwordChangedAt: 40 },
      hashMatches: false,
    }),
    { ok: false, reason: "reject" },
  );
  assert.deepEqual(
    authorizeLogin({
      account: { passwordHash: "$2a$12$hash", passwordRequired: true, passwordChangedAt: 40 },
      hashMatches: true,
    }),
    { ok: true, pwdAt: 40 },
  );
});

test("the credential file keeps the hash and drops the token after use", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "integramed-auth-"));
  const issued = issueReset(10_000);
  const account = blankAccount("prac-ivan", "ivanirt@gmail.com", true);
  account.resetTokenHash = issued.record.tokenHash;
  account.resetExpiresAt = issued.record.expiresAt;
  writeAccounts([account], dir);

  const loaded = readAccounts(dir);
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0]?.resetTokenHash, issued.record.tokenHash);
  const found = findResetAccount(loaded, issued.token, 10_000);
  assert.equal(found.status, "ok");
  loaded[found.index] = {
    ...loaded[found.index],
    passwordHash: "$2a$12$already-hashed",
    passwordRequired: true,
    passwordChangedAt: 10_500,
    resetTokenHash: null,
    resetExpiresAt: null,
  };
  writeAccounts(loaded, dir);
  const after = readAccounts(dir);
  assert.equal(after[0]?.passwordHash, "$2a$12$already-hashed");
  assert.equal(after[0]?.resetTokenHash, null);
  assert.equal(findResetAccount(after, issued.token, 10_500).status, "invalid");
  assert.equal(fs.readFileSync(path.join(dir, "accounts.json"), "utf8").includes(issued.token), false);
});

test("reset mail uses the pinned account email even when the FHIR email differs", () => {
  const pinned = "real@clinic.test";
  const fhirEmail = "attacker@evil.test";
  const accounts = [blankAccount("prac-1", pinned, true)];
  assert.equal(pinnedAccountEmail(accounts, "prac-1"), pinned);
  assert.notEqual(pinnedAccountEmail(accounts, "prac-1"), fhirEmail);
  const stored = storeResetOnPinnedAccount(accounts, "prac-1", { tokenHash: "abc", expiresAt: 99 });
  assert.equal(stored, true);
  assert.equal(accounts[0]?.email, pinned);
  assert.equal(accounts[0]?.resetTokenHash, "abc");

  const unpinned = [blankAccount("prac-2", "", true)];
  assert.equal(pinnedAccountEmail(unpinned, "prac-2"), null);
  assert.equal(storeResetOnPinnedAccount(unpinned, "prac-2", { tokenHash: "nope", expiresAt: 1 }), false);
  assert.equal(unpinned[0]?.resetTokenHash, null);

  const route = fs.readFileSync("src/app/api/auth/recuperar/route.ts", "utf8");
  assert.match(route, /pinnedAccountEmail/);
  assert.equal(route.includes("account.email"), false);
  assert.equal(route.includes("blankAccount"), false);
});

test("unset, rejected, and unknown logins share one failure result", async () => {
  const password = `${randomBytes(12).toString("base64url")}a1`;
  const other = `${randomBytes(12).toString("base64url")}b2`;
  const passwordHash = await hashPassword(password);
  const account = { passwordHash, passwordRequired: true, passwordChangedAt: 5 };
  const wrong = await checkLoginPassword(other, account);
  const unset = await checkLoginPassword(other, { passwordHash: null, passwordRequired: true });
  const missing = await checkLoginPassword(other, null);
  assert.deepEqual(wrong, { ok: false });
  assert.deepEqual(unset, wrong);
  assert.deepEqual(missing, wrong);
  assert.deepEqual(await checkLoginPassword(password, account), { ok: true, pwdAt: 5 });
  const source = fs.readFileSync("src/app/api/auth/route.ts", "utf8");
  assert.equal(source.includes("Esta cuenta no tiene contraseña"), false);
  assert.equal(source.includes("LOGIN_ERROR"), true);
});

test("mutateAccounts keeps both edits and does not leave the lock behind", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "integramed-auth-"));
  writeAccounts([blankAccount("prac-1", "real@clinic.test", true)], dir);
  mutateAccounts((accounts) => {
    const account = accounts[0];
    if (account) account.resetTokenHash = "one";
  }, dir);
  mutateAccounts((accounts) => {
    const account = accounts[0];
    if (account) account.resetExpiresAt = 5;
  }, dir);
  const loaded = readAccounts(dir);
  assert.equal(loaded[0]?.email, "real@clinic.test");
  assert.equal(loaded[0]?.resetTokenHash, "one");
  assert.equal(loaded[0]?.resetExpiresAt, 5);
  assert.equal(fs.existsSync(path.join(dir, "accounts.lock")), false);
  assert.equal(credentialFile(dir), path.join(dir, "accounts.json"));
});

test("the auth root defaults to data/auth and must be writable", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "integramed-auth-"));
  const previous = process.env.INTEGRAMED_AUTH_ROOT;
  process.env.INTEGRAMED_AUTH_ROOT = dir;
  try {
    assert.equal(credentialFile(), path.join(dir, "accounts.json"));
    assert.doesNotThrow(() => assertAuthRootWritable(dir));
  } finally {
    if (previous === undefined) delete process.env.INTEGRAMED_AUTH_ROOT;
    else process.env.INTEGRAMED_AUTH_ROOT = previous;
  }
  if (previous === undefined) {
    assert.equal(credentialFile(), path.join(process.cwd(), "data", "auth", "accounts.json"));
  }
  const blocked = path.join(dir, "not-a-directory");
  fs.writeFileSync(blocked, "x");
  assert.throws(() => assertAuthRootWritable(blocked), /no se puede escribir/);
  assert.throws(() => assertAuthRootWritable(blocked), /Monta un volumen/);

  if (typeof process.getuid !== "function" || process.getuid() !== 0) {
    const readonly = fs.mkdtempSync(path.join(os.tmpdir(), "integramed-auth-ro-"));
    fs.chmodSync(readonly, 0o555);
    try {
      assert.throws(() => assertAuthRootWritable(readonly), /uid 1001/);
      assert.throws(() => assertAuthRootWritable(readonly), /chown -R 1001:1001/);
    } finally {
      fs.chmodSync(readonly, 0o755);
      fs.rmSync(readonly, { recursive: true, force: true });
    }
  }
});
