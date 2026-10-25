import assert from "node:assert/strict";
import { test } from "node:test";
import { regionSpecificity, type IrisRegion } from "./iris-map";
import {
  angleContains,
  clockAngleDeg,
  photoToMapPolar,
  scoreAffectedOrgans,
} from "./iris-findings";
import { resolveGeometry } from "./iris-fit";

function organ(partial: Partial<IrisRegion> & Pick<IrisRegion, "id" | "organ">): IrisRegion {
  const base = {
    organKey: partial.organKey ?? partial.organ.toLowerCase(),
    kind: "organ" as const,
    number: null,
    inferred: false,
    angleStart: 0,
    angleEnd: 40,
    rMin: 200,
    rMax: 400,
    ...partial,
  };
  return { ...base, specificity: regionSpecificity(base) };
}

test("clock angles run clockwise from 12 o'clock", () => {
  assert.ok(Math.abs(clockAngleDeg(0, -10)) < 1);
  assert.ok(Math.abs(clockAngleDeg(10, 0) - 90) < 1);
  assert.ok(Math.abs(clockAngleDeg(0, 10) - 180) < 1);
});

test("angleContains wraps past 360", () => {
  assert.equal(angleContains(10, 350, 20), true);
  assert.equal(angleContains(180, 350, 20), false);
  assert.equal(angleContains(90, 70, 110), true);
});

test("photoToMapPolar maps the iris ring and skips the pupil", () => {
  const geom = resolveGeometry({
    viewBox: { minX: 0, minY: 0, width: 1200, height: 1200 },
    centerX: 600,
    centerY: 600,
    pupilRadius: 100,
    irisRadius: 500,
  });
  const fit = { cx: 50, cy: 50, rp: 10, ri: 40, rotation: 0 };
  assert.equal(photoToMapPolar(50, 50, fit, geom), null);
  const atThree = photoToMapPolar(50 + 25, 50, fit, geom);
  assert.ok(atThree);
  assert.ok(Math.abs(atThree.angle - 90) < 2);
  assert.ok(atThree.rMap > 100 && atThree.rMap < 500);
});

test("scoreAffectedOrgans ranks the organ under a dark wedge", () => {
  const width = 120;
  const height = 120;
  const gray = new Float32Array(width * height);
  gray.fill(200);
  const cx = 60;
  const cy = 60;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      const r = Math.hypot(dx, dy);
      const ang = (Math.atan2(dx, -dy) * 180) / Math.PI;
      const a = (ang + 360) % 360;
      if (r > 14 && r < 38 && a > 70 && a < 110) gray[y * width + x] = 30;
    }
  }
  const geom = resolveGeometry({
    viewBox: { minX: 0, minY: 0, width: 1200, height: 1200 },
    centerX: 600,
    centerY: 600,
    pupilRadius: 100,
    irisRadius: 500,
  });
  const fit = { cx, cy, rp: 12, ri: 42, rotation: 0 };
  const regions: IrisRegion[] = [
    organ({ id: "liver", organ: "HIGADO", organKey: "higado", angleStart: 70, angleEnd: 110, rMin: 180, rMax: 480 }),
    organ({ id: "lung", organ: "PULMON", organKey: "pulmon", angleStart: 250, angleEnd: 300, rMin: 180, rMax: 480 }),
    organ({
      id: "skin",
      organ: "PIEL",
      organKey: "piel",
      kind: "ring",
      angleStart: 0,
      angleEnd: 360,
      rMin: 480,
      rMax: 500,
    }),
  ];
  const ranked = scoreAffectedOrgans(gray, width, height, 1, fit, geom, regions, "right");
  assert.ok(ranked.length >= 1, "expected at least one finding");
  assert.equal(ranked[0].organKey, "higado");
  assert.equal(
    ranked.some((row) => row.organKey === "piel"),
    false,
  );
});
