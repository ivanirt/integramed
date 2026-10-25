/**
 * Iris window in photo pixels. The pupil is not cut out: alpha stays high
 * at the centre so the existing black-pupil overlay can cover it.
 */
export type IrisMask = {
  /** Outer window radius. Alpha reaches 0 at this distance from the centre. */
  radius: number;
  /** Soft edge, in photo pixels. */
  feather: number;
  /** Pixels cut from the top of the circle toward the centre. 0 leaves the arc intact. */
  lidTop: number;
  /** Pixels cut from the bottom of the circle toward the centre. 0 leaves the arc intact. */
  lidBottom: number;
};

/** Opaque neutral gray used outside the iris window. */
export const IRIS_CLEAN_BG = "#3A342E";

export function defaultIrisMask(ri: number): IrisMask {
  const radius = Math.max(8, ri);
  return {
    radius,
    feather: Math.max(6, radius * 0.035),
    lidTop: 0,
    lidBottom: 0,
  };
}

export function maskLimit(photoWidth: number, photoHeight: number): number {
  return Math.max(photoWidth, photoHeight, 8);
}

export function clampIrisMask(mask: IrisMask, limit: number): IrisMask {
  const radius = clamp(mask.radius, 8, Math.max(8, limit));
  const feather = clamp(mask.feather, 0, radius * 0.45);
  const lidMax = radius * 0.9;
  return {
    radius,
    feather,
    lidTop: clamp(mask.lidTop, 0, lidMax),
    lidBottom: clamp(mask.lidBottom, 0, lidMax),
  };
}

/** 0 outside the window, 1 inside, smoothstep across `feather`. */
export function irisMaskAlpha(x: number, y: number, cx: number, cy: number, mask: IrisMask): number {
  const distanceInside = mask.radius - Math.hypot(x - cx, y - cy);
  let alpha = edgeAlpha(distanceInside, mask.feather);
  if (alpha === 0) return 0;
  if (mask.lidTop > 0) {
    const chordY = cy - mask.radius + mask.lidTop;
    alpha *= edgeAlpha(y - chordY, mask.feather);
  }
  if (alpha === 0) return 0;
  if (mask.lidBottom > 0) {
    const chordY = cy + mask.radius - mask.lidBottom;
    alpha *= edgeAlpha(chordY - y, mask.feather);
  }
  return alpha;
}

function edgeAlpha(distanceInside: number, feather: number): number {
  if (distanceInside <= 0) return 0;
  if (feather <= 0 || distanceInside >= feather) return 1;
  const t = distanceInside / feather;
  return t * t * (3 - 2 * t);
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(max, Math.max(min, value));
}
