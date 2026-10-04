import assert from "node:assert/strict";
import { test } from "node:test";
import { clampFit, mapPointRadial, resolveGeometry, suggestIrisFit } from "./iris-fit";
import type { IrisGeometry } from "./iris-map";

const chart = resolveGeometry({
  viewBox: { minX: 0, minY: 0, width: 1200, height: 1200 },
  centerX: 600,
  centerY: 600,
  pupilRadius: 100,
  irisRadius: 500,
});

test("mapPointRadial sends the outer iris and the pupil to the fitted radii", () => {
  const fit = { rp: 40, ri: 160 };
  const top = mapPointRadial(600, 100, chart, fit);
  assert.ok(Math.abs(top.x - 600) < 0.01);
  assert.ok(Math.abs(top.y - (600 - 500)) < 0.01, "outer edge stays on the map radius; scale is applied by the overlay");

  const pupil = mapPointRadial(600, 500, chart, fit);
  const pupilRadius = Math.hypot(pupil.x - 600, pupil.y - 600);
  assert.ok(Math.abs(pupilRadius - (40 * 500) / 160) < 0.05);

  const mid = mapPointRadial(600, 300, chart, fit);
  const midRadius = Math.hypot(mid.x - 600, mid.y - 600);
  const expectedPhoto = 40 + ((300 - 100) / (500 - 100)) * (160 - 40);
  assert.ok(Math.abs(midRadius - (expectedPhoto * 500) / 160) < 0.05);
});

test("mapPointRadial is identity when the photo ratio matches the map", () => {
  const fit = { rp: 30, ri: 150 };
  const point = mapPointRadial(700, 650, chart, fit);
  assert.ok(Math.abs(point.x - 700) < 0.02);
  assert.ok(Math.abs(point.y - 650) < 0.02);
});

test("resolveGeometry fills missing radii and says so", () => {
  const empty: IrisGeometry = {
    viewBox: null,
    centerX: null,
    centerY: null,
    pupilRadius: null,
    irisRadius: null,
  };
  const resolved = resolveGeometry(empty);
  assert.equal(resolved.usedFallback, true);
  assert.ok(resolved.irisRadius > resolved.pupilRadius);
  assert.equal(resolved.centerX, 600);
});

test("clampFit keeps the pupil inside the iris", () => {
  const fit = clampFit({ cx: -10, cy: 20, rp: 80, ri: 40, rotation: 270 }, 200, 100);
  assert.equal(fit.cx, 0);
  assert.ok(fit.rp < fit.ri);
  assert.ok(fit.rotation <= 180 && fit.rotation >= -180);
});

test("suggestIrisFit finds a synthetic pupil and iris and ignores a blank frame", () => {
  const width = 180;
  const height = 180;
  const gray = new Float32Array(width * height);
  gray.fill(240);
  const cx = 90;
  const cy = 88;
  const rp = 16;
  const ri = 58;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const d = Math.hypot(x - cx, y - cy);
      gray[y * width + x] = d < rp ? 5 : d < ri ? 110 : 245;
    }
  }
  const fit = suggestIrisFit(gray, width, height);
  assert.ok(fit);
  assert.ok(Math.abs(fit.cx - cx) < 8, `cx ${fit?.cx}`);
  assert.ok(Math.abs(fit.cy - cy) < 8, `cy ${fit?.cy}`);
  assert.ok(Math.abs(fit.rp - rp) < 8, `rp ${fit?.rp}`);
  assert.ok(Math.abs(fit.ri - ri) < 10, `ri ${fit?.ri}`);

  const blank = new Float32Array(width * height);
  blank.fill(180);
  assert.equal(suggestIrisFit(blank, width, height), null);
});
