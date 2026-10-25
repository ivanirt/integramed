import assert from "node:assert/strict";
import { test } from "node:test";
import { clampIrisMask, defaultIrisMask, irisMaskAlpha, type IrisMask } from "./iris-mask";

const open: IrisMask = { radius: 50, feather: 10, lidTop: 0, lidBottom: 0 };

test("the pupil at the centre stays inside the window", () => {
  assert.equal(irisMaskAlpha(100, 100, 100, 100, open), 1);
  assert.equal(irisMaskAlpha(100, 112, 100, 100, open), 1);
});

test("outside the feathered ring is hidden and the mid-feather is half", () => {
  assert.equal(irisMaskAlpha(100, 40, 100, 100, open), 0);
  assert.equal(irisMaskAlpha(160, 100, 100, 100, open), 0);
  assert.equal(irisMaskAlpha(100, 50, 100, 100, open), 0);
  assert.equal(irisMaskAlpha(100, 55, 100, 100, open), 0.5);
  assert.equal(irisMaskAlpha(100, 70, 100, 100, open), 1);
});

test("a zero feather is a hard edge and does not open the outside", () => {
  const hard: IrisMask = { ...open, feather: 0 };
  assert.equal(irisMaskAlpha(100, 49, 100, 100, hard), 0);
  assert.equal(irisMaskAlpha(100, 51, 100, 100, hard), 1);
});

test("top and bottom eyelid chords cut into the circle and feather back", () => {
  const lids: IrisMask = { radius: 50, feather: 10, lidTop: 20, lidBottom: 15 };
  assert.equal(irisMaskAlpha(100, 65, 100, 100, lids), 0);
  assert.equal(irisMaskAlpha(100, 70, 100, 100, lids), 0);
  assert.equal(irisMaskAlpha(100, 75, 100, 100, lids), 0.5);
  assert.equal(irisMaskAlpha(100, 90, 100, 100, lids), 1);
  assert.equal(irisMaskAlpha(100, 140, 100, 100, lids), 0);
  assert.equal(irisMaskAlpha(100, 130, 100, 100, lids), 0.5);
  assert.equal(irisMaskAlpha(100, 100, 100, 100, lids), 1);
});

test("defaultIrisMask follows the iris radius and starts with no eyelid trim", () => {
  const mask = defaultIrisMask(200);
  assert.equal(mask.radius, 200);
  assert.ok(mask.feather >= 6);
  assert.equal(mask.lidTop, 0);
  assert.equal(mask.lidBottom, 0);
});

test("clampIrisMask keeps the window inside the photo and the lids from meeting", () => {
  const clamped = clampIrisMask({ radius: 900, feather: 400, lidTop: -5, lidBottom: 800 }, 100);
  assert.equal(clamped.radius, 100);
  assert.equal(clamped.feather, 45);
  assert.equal(clamped.lidTop, 0);
  assert.equal(clamped.lidBottom, 90);
});
