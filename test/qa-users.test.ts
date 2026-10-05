import assert from "node:assert/strict";
import test from "node:test";
import { ROLE_LABELS } from "../src/lib/roles.ts";
import { validateNewPassword } from "../src/lib/password-reset.ts";
import { definedRoles, generatePassword, isTestUserEmail, testUserEmail } from "../scripts/qa-users.ts";

test("test users follow every role exported from roles.ts", () => {
  const roles = definedRoles();
  assert.deepEqual(roles, Object.keys(ROLE_LABELS));
  assert.ok(roles.length > 0);
  const emails = roles.map((role) => testUserEmail(role));
  assert.equal(new Set(emails).size, emails.length);
  for (const email of emails) {
    assert.match(email, /^qa\+[a-z0-9_-]+@integramed\.local$/);
    assert.equal(isTestUserEmail(email), true);
  }
  assert.equal(isTestUserEmail("ivanirt@gmail.com"), false);
  assert.equal(isTestUserEmail("ivan_renteria@integramed.com"), false);
});

test("generated passwords are strong, unique, and accepted by the reset rules", () => {
  const passwords = new Set<string>();
  for (let i = 0; i < 5; i += 1) {
    const password = generatePassword();
    assert.equal(validateNewPassword(password, password), null);
    assert.ok(password.length >= 24);
    assert.match(password, /[A-Za-z]/);
    assert.match(password, /\d/);
    passwords.add(password);
  }
  assert.equal(passwords.size, 5);
});
