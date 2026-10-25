import assert from "node:assert/strict";
import { test } from "node:test";
import { canAccess, ROLE_SCREENS } from "./roles";
import { resolveIridologyAccess, withoutLegacyIrisFlag } from "./iridology-access";

const catalogOff = [{ id: "iridology", enabled: false }];
const catalogOn = [{ id: "iridology", enabled: true }];

test("the iris screen follows iridology, and a saved iris flag is only a legacy or", () => {
  assert.deepEqual(resolveIridologyAccess({}, catalogOff), { enabled: false, legacyConflict: false });
  assert.deepEqual(resolveIridologyAccess({}, catalogOn), { enabled: true, legacyConflict: false });
  assert.deepEqual(resolveIridologyAccess({ iris: true }, catalogOff), { enabled: true, legacyConflict: true });
  assert.deepEqual(resolveIridologyAccess({ iris: true }, catalogOn), { enabled: true, legacyConflict: false });
  assert.deepEqual(resolveIridologyAccess({ iris: false }, catalogOn), { enabled: true, legacyConflict: false });
  assert.deepEqual(resolveIridologyAccess({ iris: true }, []), { enabled: true, legacyConflict: true });
});

test("withoutLegacyIrisFlag drops the old module key and leaves the others", () => {
  assert.deepEqual(withoutLegacyIrisFlag({ home: true, iris: true, boveda: false }), { home: true, boveda: false });
  assert.deepEqual(withoutLegacyIrisFlag({ home: true }), { home: true });
});

test("lab cannot open the iris screen even when iridology is on", () => {
  assert.equal(ROLE_SCREENS.lab.includes("iris"), false);
  assert.equal(canAccess("lab", "iris", { iridology: true }), false);
  assert.equal(canAccess("doctor", "iris", { iridology: true }), true);
  assert.equal(canAccess("therapist", "iris", { iridology: true }), true);
  assert.equal(canAccess("nurse", "iris", { iridology: true }), true);
  assert.equal(canAccess("admin", "iris", { iridology: true }), true);
  assert.equal(canAccess("doctor", "iris", { iridology: false }), false);
  assert.equal(canAccess("doctor", "iris", {}), false);
  assert.equal(canAccess("receptionist", "iris", { iridology: true }), false);
});
