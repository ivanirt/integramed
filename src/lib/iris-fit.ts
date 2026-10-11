import type { IrisGeometry } from "./iris-map";

export type IrisFit = {
  /** Photo-space centre, pixels. */
  cx: number;
  cy: number;
  /** Fitted pupil and outer iris radii in photo pixels. */
  rp: number;
  ri: number;
  /** Degrees clockwise from 12 o'clock. */
  rotation: number;
};

export type ResolvedIrisGeometry = {
  viewBox: { minX: number; minY: number; width: number; height: number };
  centerX: number;
  centerY: number;
  pupilRadius: number;
  irisRadius: number;
  usedFallback: boolean;
};

export function resolveGeometry(geometry: IrisGeometry): ResolvedIrisGeometry {
  const viewBox = geometry.viewBox ?? { minX: 0, minY: 0, width: 1200, height: 1200 };
  const centerX = geometry.centerX ?? viewBox.minX + viewBox.width / 2;
  const centerY = geometry.centerY ?? viewBox.minY + viewBox.height / 2;
  let irisRadius = geometry.irisRadius;
  let pupilRadius = geometry.pupilRadius;
  let usedFallback = !geometry.viewBox || geometry.centerX == null || geometry.centerY == null;
  if (irisRadius == null || irisRadius <= 0) {
    irisRadius = Math.min(viewBox.width, viewBox.height) * 0.42;
    usedFallback = true;
  }
  if (pupilRadius == null || pupilRadius <= 0) {
    pupilRadius = irisRadius * 0.2;
    usedFallback = true;
  }
  if (pupilRadius >= irisRadius) {
    pupilRadius = irisRadius * 0.2;
    usedFallback = true;
  }
  return { viewBox, centerX, centerY, pupilRadius, irisRadius, usedFallback };
}

/**
 * Move a map-space point radially so the pupil and outer iris match the fit,
 * without rotating it. Rotation is applied by the overlay transform.
 * When the photo ratio matches the map, this is the identity.
 */
export function mapPointRadial(
  x: number,
  y: number,
  geom: ResolvedIrisGeometry,
  fit: Pick<IrisFit, "rp" | "ri">,
): { x: number; y: number } {
  const dx = x - geom.centerX;
  const dy = y - geom.centerY;
  const r = Math.hypot(dx, dy);
  if (r < 1e-6 || fit.ri <= 1) return { x: geom.centerX, y: geom.centerY };
  const Rp = geom.pupilRadius;
  const Ri = geom.irisRadius;
  const rPhoto =
    r <= Rp || Ri <= Rp + 0.5
      ? (r / Math.max(Rp, 1)) * (Ri <= Rp + 0.5 ? fit.ri : fit.rp)
      : fit.rp + ((r - Rp) / (Ri - Rp)) * (fit.ri - fit.rp);
  const rMap = (rPhoto * Ri) / fit.ri;
  const k = rMap / r;
  return { x: geom.centerX + dx * k, y: geom.centerY + dy * k };
}

export function defaultFit(
  photoWidth: number,
  photoHeight: number,
  geom: ResolvedIrisGeometry,
): IrisFit {
  const ri = Math.min(photoWidth, photoHeight) * 0.36;
  const rp = ri * (geom.pupilRadius / geom.irisRadius);
  return {
    cx: photoWidth / 2,
    cy: photoHeight / 2,
    rp,
    ri,
    rotation: 0,
  };
}

export function clampFit(fit: IrisFit, photoWidth: number, photoHeight: number): IrisFit {
  const maxR = Math.max(photoWidth, photoHeight);
  const cx = Math.min(photoWidth, Math.max(0, fit.cx));
  const cy = Math.min(photoHeight, Math.max(0, fit.cy));
  const ri = Math.min(maxR, Math.max(12, fit.ri));
  let rp = Math.min(ri - 6, Math.max(4, fit.rp));
  if (rp >= ri) rp = ri * 0.2;
  let rotation = fit.rotation % 360;
  if (rotation > 180) rotation -= 360;
  if (rotation < -180) rotation += 360;
  return { cx, cy, rp, ri, rotation };
}

function sampleBilinear(gray: Float32Array, width: number, height: number, x: number, y: number): number {
  if (x < 0 || y < 0 || x > width - 1 || y > height - 1) return 255;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = x - x0;
  const ty = y - y0;
  const i = y0 * width + x0;
  const row = width;
  return (
    gray[i] * (1 - tx) * (1 - ty) +
    gray[i + 1] * tx * (1 - ty) +
    gray[i + row] * (1 - tx) * ty +
    gray[i + row + 1] * tx * ty
  );
}

function meanCircle(
  gray: Float32Array,
  width: number,
  height: number,
  cx: number,
  cy: number,
  radius: number,
): number {
  const n = 56;
  let sum = 0;
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    sum += sampleBilinear(gray, width, height, cx + radius * Math.cos(a), cy + radius * Math.sin(a));
  }
  return sum / n;
}

/**
 * Rough in-browser pupil/iris estimate. It is a starting point: photos in the
 * earlier prototype usually still needed a manual correction, and rotation is
 * not estimated at all.
 */
export function suggestIrisFit(
  gray: Float32Array,
  width: number,
  height: number,
): Pick<IrisFit, "cx" | "cy" | "rp" | "ri"> | null {
  if (width < 16 || height < 16 || gray.length < width * height) return null;
  const minSide = Math.min(width, height);
  const step = Math.max(2, Math.round(minSide / 48));
  const pupilRadii: number[] = [];
  for (let r = minSide * 0.05; r <= minSide * 0.22; r += Math.max(2, minSide * 0.025)) {
    pupilRadii.push(r);
  }
  let bestPupil: { cx: number; cy: number; rp: number; score: number } | null = null;
  const x0 = Math.round(width * 0.28);
  const x1 = Math.round(width * 0.72);
  const y0 = Math.round(height * 0.28);
  const y1 = Math.round(height * 0.72);
  for (let cy = y0; cy <= y1; cy += step) {
    for (let cx = x0; cx <= x1; cx += step) {
      for (const rp of pupilRadii) {
        const inside = meanCircle(gray, width, height, cx, cy, rp * 0.55);
        const outside = meanCircle(gray, width, height, cx, cy, Math.min(rp * 1.35, minSide * 0.45));
        const off = Math.hypot(cx - width / 2, cy - height / 2) / minSide;
        const score = outside - inside - off * 25;
        if (!bestPupil || score > bestPupil.score) bestPupil = { cx, cy, rp, score };
      }
    }
  }
  if (!bestPupil || bestPupil.score < 12) return null;

  let cx = bestPupil.cx;
  let cy = bestPupil.cy;
  let rp = bestPupil.rp;
  const refine = Math.max(1, Math.round(step / 2));
  let refined: { cx: number; cy: number; rp: number; score: number } | null = null;
  for (let y = cy - step; y <= cy + step; y += refine) {
    for (let x = cx - step; x <= cx + step; x += refine) {
      for (const radius of [rp * 0.8, rp, rp * 1.2]) {
        if (radius < 4) continue;
        const inside = meanCircle(gray, width, height, x, y, radius * 0.55);
        const outside = meanCircle(gray, width, height, x, y, radius * 1.35);
        const score = outside - inside;
        if (!refined || score > refined.score) refined = { cx: x, cy: y, rp: radius, score };
      }
    }
  }
  if (refined) {
    cx = refined.cx;
    cy = refined.cy;
    rp = refined.rp;
  }

  const maxR = minSide * 0.48;
  let bestIris: { ri: number; score: number } | null = null;
  for (let r = rp * 1.8; r <= maxR; r += Math.max(1.5, minSide / 80)) {
    const inner = meanCircle(gray, width, height, cx, cy, Math.max(rp + 1, r - 2));
    const outer = meanCircle(gray, width, height, cx, cy, r + 3);
    const score = outer - inner;
    if (!bestIris || score > bestIris.score) bestIris = { ri: r, score };
  }
  if (!bestIris || bestIris.score < 8 || bestIris.ri <= rp * 1.3) return null;
  return { cx, cy, rp, ri: bestIris.ri };
}
