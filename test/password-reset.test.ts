import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { blankAccount, readAccounts, writeAccounts } from "../src/lib/credentials.ts";
import {
  RESET_TTL_MS,
  findResetAccount,
  generateResetToken,
  hashResetToken,
  issueReset,
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

test("login uses a personal hash, blocks an unset password, and otherwise keeps the clinic password", () => {
  assert.equal(loginStrategy(null), "master");
  assert.equal(loginStrategy({ passwordHash: null, passwordRequired: false }), "master");
  assert.equal(loginStrategy({ passwordHash: null, passwordRequired: true }), "unset");
  assert.equal(loginStrategy({ passwordHash: "$2a$12$hash", passwordRequired: true }), "hash");
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
  assert.equal(fs.readFileSync(path.join(dir, "data", "auth", "accounts.json"), "utf8").includes(issued.token), false);
});
