import { IRIS_CLEAN_BG, irisMaskAlpha, type IrisMask } from "@/lib/iris-mask";

const BG_R = 0x3a;
const BG_G = 0x34;
const BG_B = 0x2e;

const imageCache = new Map<string, Promise<HTMLImageElement>>();

export function loadHtmlImage(url: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(url);
  if (cached) return cached;
  const pending = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => {
      imageCache.delete(url);
      reject(new Error("No se pudo leer la foto."));
    };
    image.src = url;
  });
  imageCache.set(url, pending);
  if (imageCache.size > 8) {
    const oldest = imageCache.keys().next().value;
    if (oldest && oldest !== url) imageCache.delete(oldest);
  }
  return pending;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("No se pudo generar el PNG."))), "image/png");
  });
}

/**
 * Paint `source` into `ctx.canvas`, keeping only the iris window.
 * Mask numbers are in photo pixels. The canvas may be a smaller preview
 * as long as it keeps the photo aspect ratio.
 */
export function paintIrisClean(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  photoWidth: number,
  photoHeight: number,
  cx: number,
  cy: number,
  mask: IrisMask,
  shouldAbort?: () => boolean,
): void {
  const canvas = ctx.canvas;
  const w = canvas.width;
  const h = canvas.height;
  if (w < 1 || h < 1 || photoWidth < 1 || photoHeight < 1) return;
  ctx.drawImage(source, 0, 0, w, h);
  const scaleX = w / photoWidth;
  const scaleY = h / photoHeight;
  const pad = mask.radius + mask.feather + 2;
  const x0 = clampInt(Math.floor((cx - pad) * scaleX), 0, w);
  const y0 = clampInt(Math.floor((cy - pad) * scaleY), 0, h);
  const x1 = clampInt(Math.ceil((cx + pad) * scaleX), 0, w);
  const y1 = clampInt(Math.ceil((cy + pad) * scaleY), 0, h);

  ctx.fillStyle = IRIS_CLEAN_BG;
  if (y0 > 0) ctx.fillRect(0, 0, w, y0);
  if (y1 < h) ctx.fillRect(0, y1, w, h - y1);
  if (x0 > 0) ctx.fillRect(0, y0, x0, Math.max(0, y1 - y0));
  if (x1 < w) ctx.fillRect(x1, y0, w - x1, Math.max(0, y1 - y0));

  const boxW = x1 - x0;
  const boxH = y1 - y0;
  if (boxW <= 0 || boxH <= 0) return;
  const image = ctx.getImageData(x0, y0, boxW, boxH);
  const data = image.data;
  for (let row = 0; row < boxH; row += 1) {
    if ((row & 31) === 0 && shouldAbort?.()) return;
    const photoY = (y0 + row + 0.5) / scaleY;
    for (let col = 0; col < boxW; col += 1) {
      const photoX = (x0 + col + 0.5) / scaleX;
      const alpha = irisMaskAlpha(photoX, photoY, cx, cy, mask);
      const index = (row * boxW + col) * 4;
      if (alpha >= 1) continue;
      if (alpha <= 0) {
        data[index] = BG_R;
        data[index + 1] = BG_G;
        data[index + 2] = BG_B;
        data[index + 3] = 255;
        continue;
      }
      data[index] = Math.round(data[index] * alpha + BG_R * (1 - alpha));
      data[index + 1] = Math.round(data[index + 1] * alpha + BG_G * (1 - alpha));
      data[index + 2] = Math.round(data[index + 2] * alpha + BG_B * (1 - alpha));
      data[index + 3] = 255;
    }
  }
  if (shouldAbort?.()) return;
  ctx.putImageData(image, x0, y0);
}

export async function cleanedPhotoBlob(
  photoUrl: string,
  photoWidth: number,
  photoHeight: number,
  cx: number,
  cy: number,
  mask: IrisMask,
): Promise<Blob> {
  const image = await loadHtmlImage(photoUrl);
  const canvas = document.createElement("canvas");
  canvas.width = photoWidth;
  canvas.height = photoHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("No se pudo crear el lienzo.");
  paintIrisClean(ctx, image, photoWidth, photoHeight, cx, cy, mask);
  return canvasToBlob(canvas);
}

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}
