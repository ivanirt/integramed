import { angleSpanDegrees, pickMostSpecific, type IrisEye, type IrisRegion } from "./iris-map";
import type { IrisFit, ResolvedIrisGeometry } from "./iris-fit";

export type IrisFinding = {
  organKey: string;
  organ: string;
  eye: IrisEye;
  score: number;
  samples: number;
};

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

export function clockAngleDeg(dx: number, dy: number): number {
  const deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
  return (deg + 360) % 360;
}

export function angleContains(deg: number, start: number, end: number): boolean {
  const span = angleSpanDegrees(start, end);
  if (span == null || span >= 359.5) return true;
  const a = ((deg % 360) + 360) % 360;
  const s = ((start % 360) + 360) % 360;
  const e = ((end % 360) + 360) % 360;
  if (s <= e) return a >= s && a <= e;
  return a >= s || a <= e;
}

function radiusContains(region: IrisRegion, rMap: number): boolean {
  let inner = region.rMin;
  let outer = region.rMax;
  if (inner == null && outer == null) return false;
  if (inner == null) inner = outer;
  if (outer == null) outer = inner;
  if (inner == null || outer == null) return false;
  const lo = Math.min(inner, outer);
  const hi = Math.max(inner, outer);
  if (hi - lo < 1) {
    const pad = Math.max(6, hi * 0.05);
    return rMap >= lo - pad && rMap <= hi + pad;
  }
  return rMap >= lo && rMap <= hi;
}

export function regionContainsPolar(region: IrisRegion, angle: number, rMap: number): boolean {
  if (region.angleStart != null && region.angleEnd != null) {
    if (!angleContains(angle, region.angleStart, region.angleEnd)) return false;
  } else {
    return false;
  }
  return radiusContains(region, rMap);
}

function unrotate(dx: number, dy: number, rotationDeg: number): { dx: number; dy: number } {
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { dx: dx * cos + dy * sin, dy: -dx * sin + dy * cos };
}

export function photoToMapPolar(
  x: number,
  y: number,
  fit: IrisFit,
  geom: ResolvedIrisGeometry,
): { angle: number; rMap: number; rPhoto: number } | null {
  const raw = unrotate(x - fit.cx, y - fit.cy, fit.rotation);
  const rPhoto = Math.hypot(raw.dx, raw.dy);
  if (rPhoto < fit.rp + 1 || rPhoto > fit.ri - 1) return null;
  const angle = clockAngleDeg(raw.dx, raw.dy);
  const Rp = geom.pupilRadius;
  const Ri = geom.irisRadius;
  const span = Math.max(fit.ri - fit.rp, 1);
  const rMap = Rp + ((rPhoto - fit.rp) / span) * (Ri - Rp);
  return { angle, rMap, rPhoto };
}

/**
 * Rank organ sectors whose pixels are darker than the same radial ring.
 * Rings and bands are skipped. This is a pigment contrast, not a diagnosis.
 */
export function scoreAffectedOrgans(
  gray: Float32Array,
  width: number,
  height: number,
  scale: number,
  fit: IrisFit,
  geom: ResolvedIrisGeometry,
  regions: IrisRegion[],
  eye: IrisEye,
): IrisFinding[] {
  if (width < 8 || height < 8 || gray.length < width * height) return [];
  const organs = regions.filter((region) => region.kind === "organ");
  if (!organs.length) return [];

  const fitPx: IrisFit = {
    ...fit,
    cx: fit.cx * scale,
    cy: fit.cy * scale,
    rp: fit.rp * scale,
    ri: fit.ri * scale,
  };
  const radialBins = 24;
  const radialSum = new Float32Array(radialBins);
  const radialCount = new Uint32Array(radialBins);
  const samples: { angle: number; rMap: number; bin: number; value: number }[] = [];

  const rSteps = 36;
  const aSteps = 120;
  for (let ir = 0; ir < rSteps; ir += 1) {
    const t = (ir + 0.5) / rSteps;
    const rPhoto = fitPx.rp + t * (fitPx.ri - fitPx.rp);
    for (let ia = 0; ia < aSteps; ia += 1) {
      const a = ((ia + 0.5) / aSteps) * Math.PI * 2;
      const x = fitPx.cx + rPhoto * Math.sin(a);
      const y = fitPx.cy - rPhoto * Math.cos(a);
      const polar = photoToMapPolar(x / scale, y / scale, fit, geom);
      if (!polar) continue;
      const value = sampleBilinear(gray, width, height, x, y);
      const bin = Math.min(radialBins - 1, Math.floor(t * radialBins));
      radialSum[bin] += value;
      radialCount[bin] += 1;
      samples.push({ angle: polar.angle, rMap: polar.rMap, bin, value });
    }
  }
  if (samples.length < 40) return [];

  const radialMean = new Float32Array(radialBins);
  for (let i = 0; i < radialBins; i += 1) {
    radialMean[i] = radialCount[i] ? radialSum[i] / radialCount[i] : 128;
  }

  const byKey = new Map<string, { organ: string; dark: number; samples: number; span: number }>();
  for (const sample of samples) {
    const expected = radialMean[sample.bin];
    const residual = expected - sample.value;
    if (residual < 4) continue;
    const hits = organs.filter((region) => regionContainsPolar(region, sample.angle, sample.rMap));
    const best = pickMostSpecific(hits);
    if (!best) continue;
    let row = byKey.get(best.organKey);
    if (!row) {
      row = {
        organ: best.organ,
        dark: 0,
        samples: 0,
        span: angleSpanDegrees(best.angleStart, best.angleEnd) ?? 360,
      };
      byKey.set(best.organKey, row);
    }
    row.dark += residual;
    row.samples += 1;
  }

  const ranked: IrisFinding[] = [...byKey.entries()]
    .map(([organKey, row]) => {
      const density = row.dark / Math.max(row.samples, 1);
      const focus = 1 / Math.sqrt(Math.max(row.span, 8) / 40);
      return {
        organKey,
        organ: row.organ,
        eye,
        score: density * focus * Math.log1p(row.samples),
        samples: row.samples,
      };
    })
    .filter((row) => row.samples >= 6)
    .sort((a, b) => b.score - a.score);

  if (!ranked.length) return [];
  const floor = ranked[0].score * 0.35;
  return ranked.filter((row) => row.score >= floor).slice(0, 8);
}

export function rasterFromImage(image: CanvasImageSource, width: number, height: number) {
  const maxSide = 420;
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const w = Math.max(2, Math.round(width * scale));
  const h = Math.max(2, Math.round(height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(image, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const gray = new Float32Array(w * h);
  for (let i = 0; i < gray.length; i += 1) {
    gray[i] = data[i * 4] * 0.299 + data[i * 4 + 1] * 0.587 + data[i * 4 + 2] * 0.114;
  }
  return { gray, width: w, height: h, scale };
}

export function findingsSentence(rows: IrisFinding[]): string {
  if (!rows.length) return "";
  const parts = rows.map((row) => {
    const side = row.eye === "left" ? "izquierdo" : "derecho";
    return `${row.organ} (ojo ${side})`;
  });
  if (parts.length === 1) return `Zona más marcada respecto al resto del anillo: ${parts[0]}.`;
  return `Zonas más marcadas respecto al resto del anillo: ${parts.join("; ")}.`;
}
