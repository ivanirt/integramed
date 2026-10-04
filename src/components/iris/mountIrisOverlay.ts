import { mapPointRadial, type IrisFit, type ResolvedIrisGeometry } from "@/lib/iris-fit";
import { splitSubpaths } from "@/lib/iris-path";
import type { IrisMap, IrisRegion } from "@/lib/iris-map";

const SVG_NS = "http://www.w3.org/2000/svg";

type Point = { x: number; y: number };

type PathSnap = {
  el: SVGPathElement;
  original: string;
  subpaths: { pts: Point[]; closed: boolean }[];
};

type LineSnap = { el: SVGLineElement; x1: number; y1: number; x2: number; y2: number };
type CircleSnap = { el: SVGCircleElement; r: number };
type TextSnap =
  | { el: SVGTextElement; mode: "translate"; x: number; y: number; rotate: number }
  | { el: SVGTextElement; mode: "xy"; x: number; y: number };
type PointListSnap = { el: SVGPolygonElement | SVGPolylineElement; points: Point[]; close: boolean };

export type IrisOverlayController = {
  svg: SVGSVGElement;
  apply(fit: IrisFit, photoWidth: number, photoHeight: number): void;
  setOpacity(opacity: number): void;
  setVisible(visible: boolean): void;
  setLabels(visible: boolean): void;
  setHighlight(selectedKey: string | null, hoverKey: string | null): void;
  pick(clientX: number, clientY: number): string | null;
  element: SVGSVGElement;
};

function readTranslateRotate(transform: string): { x: number; y: number; rotate: number } | null {
  const translate = transform.match(/translate\(\s*([+-]?(?:\d+\.?\d*|\.\d+))(?:[\s,]+([+-]?(?:\d+\.?\d*|\.\d+)))?\s*\)/i);
  if (!translate) return null;
  const rotate = transform.match(/rotate\(\s*([+-]?(?:\d+\.?\d*|\.\d+))/i);
  return {
    x: Number(translate[1]),
    y: translate[2] != null ? Number(translate[2]) : 0,
    rotate: rotate ? Number(rotate[1]) : 0,
  };
}

function pointsToD(subpaths: { pts: Point[]; closed: boolean }[]): string {
  return subpaths
    .filter((sub) => sub.pts.length)
    .map((sub) => {
      const [first, ...rest] = sub.pts;
      let d = `M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`;
      for (const point of rest) d += ` L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
      if (sub.closed) d += " Z";
      return d;
    })
    .join(" ");
}

function sampleSubpath(svg: SVGSVGElement, d: string): { pts: Point[]; closed: boolean } | null {
  const probe = document.createElementNS(SVG_NS, "path");
  probe.setAttribute("d", d);
  svg.appendChild(probe);
  let length = 0;
  try {
    length = probe.getTotalLength();
  } catch {
    length = 0;
  }
  if (!Number.isFinite(length) || length <= 0) {
    probe.remove();
    return null;
  }
  const steps = Math.max(1, Math.ceil(length / 3));
  const pts: Point[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const point = probe.getPointAtLength(Math.min(length, (length * i) / steps));
    const prev = pts[pts.length - 1];
    if (!prev || Math.hypot(prev.x - point.x, prev.y - point.y) > 0.05) {
      pts.push({ x: point.x, y: point.y });
    }
  }
  probe.remove();
  return { pts, closed: /[zZ]\s*$/.test(d.trim()) };
}

function hideBackdrop(svg: SVGSVGElement, geom: ResolvedIrisGeometry) {
  svg.querySelectorAll("rect").forEach((rect) => {
    const width = Number(rect.getAttribute("width"));
    const height = Number(rect.getAttribute("height"));
    const covers =
      rect.id === "fondo" ||
      (Number.isFinite(width) &&
        Number.isFinite(height) &&
        width >= geom.viewBox.width * 0.9 &&
        height >= geom.viewBox.height * 0.9);
    if (!covers) return;
    rect.setAttribute("fill", "none");
    rect.style.display = "none";
  });
}

export function mountIrisOverlay(
  host: HTMLElement,
  svgText: string,
  map: IrisMap,
  geom: ResolvedIrisGeometry,
): IrisOverlayController {
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  if (doc.querySelector("parsererror") || doc.documentElement.localName !== "svg") {
    throw new Error("El SVG del mapa está mal formado.");
  }
  const svg = doc.documentElement as unknown as SVGSVGElement;
  svg.classList.add("iris-overlay");
  svg.setAttribute("width", String(geom.viewBox.width));
  svg.setAttribute("height", String(geom.viewBox.height));
  svg.style.position = "absolute";
  svg.style.overflow = "visible";
  svg.style.visibility = "hidden";
  host.replaceChildren(svg);
  hideBackdrop(svg, geom);

  const style = document.createElementNS(SVG_NS, "style");
  style.textContent = `
    .iris-overlay .pupil { fill: transparent !important; stroke: rgba(36,27,22,0.75); stroke-width: 1.4; }
    .iris-overlay, .iris-overlay * { pointer-events: none; }
    .iris-overlay .region { pointer-events: fill; cursor: pointer; }
    .iris-overlay .region:hover { fill: #000; fill-opacity: 0; }
    .iris-overlay .region.is-hot { fill: #8C3A2A; fill-opacity: 0.28; stroke: #241B16; stroke-width: 1.25; }
    .iris-overlay .region.is-selected { fill: #8C3A2A; fill-opacity: 0.5; stroke: #241B16; stroke-width: 1.7; }
    .iris-overlay.is-hidden, .iris-overlay.is-hidden * { visibility: hidden !important; pointer-events: none !important; }
  `;
  svg.appendChild(style);

  const byId = new Map<string, IrisRegion>(map.regions.map((region) => [region.id, region]));
  const regionPaths = new Map<string, SVGPathElement[]>();

  const paths: PathSnap[] = [];
  svg.querySelectorAll("path").forEach((el) => {
    const original = el.getAttribute("d") || "";
    if (!original.trim()) return;
    const group = el.closest("g");
    if (group?.id && byId.has(group.id)) {
      el.classList.add("region");
      const list = regionPaths.get(group.id) ?? [];
      list.push(el);
      regionPaths.set(group.id, list);
    }
    const subs = splitSubpaths(original);
    const sampled = (subs.length ? subs : [original]).map((sub) => sampleSubpath(svg, sub));
    if (sampled.some((sub) => !sub || sub.pts.length < 2)) {
      paths.push({ el, original, subpaths: [] });
      return;
    }
    paths.push({
      el,
      original,
      subpaths: sampled.filter((sub): sub is { pts: Point[]; closed: boolean } => Boolean(sub)),
    });
  });

  const lines: LineSnap[] = [];
  svg.querySelectorAll("line").forEach((el) => {
    const x1 = Number(el.getAttribute("x1"));
    const y1 = Number(el.getAttribute("y1"));
    const x2 = Number(el.getAttribute("x2"));
    const y2 = Number(el.getAttribute("y2"));
    if ([x1, y1, x2, y2].every((n) => Number.isFinite(n))) lines.push({ el, x1, y1, x2, y2 });
  });

  const circles: CircleSnap[] = [];
  svg.querySelectorAll("circle").forEach((el) => {
    const r = Number(el.getAttribute("r"));
    if (Number.isFinite(r)) circles.push({ el, r });
  });

  const texts: TextSnap[] = [];
  svg.querySelectorAll("text").forEach((el) => {
    if (el.querySelector("textPath")) return;
    const transform = el.getAttribute("transform") || "";
    const translated = transform ? readTranslateRotate(transform) : null;
    if (translated) {
      texts.push({ el, mode: "translate", x: translated.x, y: translated.y, rotate: translated.rotate });
      return;
    }
    const x = Number(el.getAttribute("x"));
    const y = Number(el.getAttribute("y"));
    if (Number.isFinite(x) && Number.isFinite(y)) texts.push({ el, mode: "xy", x, y });
  });

  const pointLists: PointListSnap[] = [];
  svg.querySelectorAll("polygon, polyline").forEach((el) => {
    const nums = (el.getAttribute("points") || "").match(/[+-]?(?:\d+\.?\d*|\.\d+)/g)?.map(Number) ?? [];
    const points: Point[] = [];
    for (let i = 0; i + 1 < nums.length; i += 2) points.push({ x: nums[i], y: nums[i + 1] });
    if (points.length) {
      pointLists.push({
        el: el as SVGPolygonElement | SVGPolylineElement,
        points,
        close: el.localName === "polygon",
      });
    }
  });

  let warpKey = "";
  let photoWidth = 0;
  let photoHeight = 0;
  let visible = true;

  function restoreGeometry() {
    for (const path of paths) path.el.setAttribute("d", path.original);
    for (const line of lines) {
      line.el.setAttribute("x1", String(line.x1));
      line.el.setAttribute("y1", String(line.y1));
      line.el.setAttribute("x2", String(line.x2));
      line.el.setAttribute("y2", String(line.y2));
    }
    for (const circle of circles) circle.el.setAttribute("r", String(circle.r));
    for (const text of texts) {
      if (text.mode === "translate") {
        text.el.setAttribute(
          "transform",
          `translate(${text.x} ${text.y}) rotate(${text.rotate})`,
        );
      } else {
        text.el.setAttribute("x", String(text.x));
        text.el.setAttribute("y", String(text.y));
      }
    }
    for (const list of pointLists) {
      list.el.setAttribute("points", list.points.map((point) => `${point.x} ${point.y}`).join(" "));
    }
  }

  function warpGeometry(fit: IrisFit) {
    const move = (point: Point) => mapPointRadial(point.x, point.y, geom, fit);
    for (const path of paths) {
      if (!path.subpaths.length) continue;
      const subpaths = path.subpaths.map((sub) => ({ pts: sub.pts.map(move), closed: sub.closed }));
      path.el.setAttribute("d", pointsToD(subpaths));
    }
    for (const line of lines) {
      const a = move({ x: line.x1, y: line.y1 });
      const b = move({ x: line.x2, y: line.y2 });
      line.el.setAttribute("x1", a.x.toFixed(2));
      line.el.setAttribute("y1", a.y.toFixed(2));
      line.el.setAttribute("x2", b.x.toFixed(2));
      line.el.setAttribute("y2", b.y.toFixed(2));
    }
    for (const circle of circles) {
      const edge = move({ x: geom.centerX, y: geom.centerY - circle.r });
      const radius = Math.hypot(edge.x - geom.centerX, edge.y - geom.centerY);
      circle.el.setAttribute("r", radius.toFixed(2));
    }
    for (const text of texts) {
      const point = move({ x: text.x, y: text.y });
      if (text.mode === "translate") {
        text.el.setAttribute(
          "transform",
          `translate(${point.x.toFixed(2)} ${point.y.toFixed(2)}) rotate(${text.rotate})`,
        );
      } else {
        text.el.setAttribute("x", point.x.toFixed(2));
        text.el.setAttribute("y", point.y.toFixed(2));
      }
    }
    for (const list of pointLists) {
      const moved = list.points.map(move);
      list.el.setAttribute("points", moved.map((point) => `${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" "));
    }
  }

  function place(fit: IrisFit) {
    if (photoWidth < 2 || photoHeight < 2) return;
    const scale = fit.ri / geom.irisRadius;
    const width = geom.viewBox.width * scale;
    const height = geom.viewBox.height * scale;
    const left = fit.cx - (geom.centerX - geom.viewBox.minX) * scale;
    const top = fit.cy - (geom.centerY - geom.viewBox.minY) * scale;
    svg.style.left = `${(left / photoWidth) * 100}%`;
    svg.style.top = `${(top / photoHeight) * 100}%`;
    svg.style.width = `${(width / photoWidth) * 100}%`;
    svg.style.height = `${(height / photoHeight) * 100}%`;
    svg.style.transform = `rotate(${fit.rotation}deg)`;
    svg.style.transformOrigin = `${((geom.centerX - geom.viewBox.minX) / geom.viewBox.width) * 100}% ${((geom.centerY - geom.viewBox.minY) / geom.viewBox.height) * 100}%`;
    svg.style.visibility = visible ? "visible" : "hidden";
  }

  function regionFrom(node: Element | null): IrisRegion | null {
    let current: Element | null = node;
    while (current && current !== svg) {
      if (current.id && byId.has(current.id)) return byId.get(current.id) ?? null;
      current = current.parentElement;
    }
    return null;
  }

  return {
    svg,
    element: svg,
    apply(fit, nextWidth, nextHeight) {
      photoWidth = nextWidth;
      photoHeight = nextHeight;
      const native = geom.pupilRadius / geom.irisRadius;
      const ratio = fit.rp / fit.ri;
      const key = Math.abs(ratio - native) < 0.002 ? "native" : `${fit.rp.toFixed(2)}/${fit.ri.toFixed(2)}`;
      if (key !== warpKey) {
        if (key === "native") restoreGeometry();
        else warpGeometry(fit);
        warpKey = key;
      }
      place(fit);
    },
    setOpacity(opacity) {
      svg.style.opacity = String(Math.min(1, Math.max(0, opacity)));
    },
    setVisible(next) {
      visible = next;
      svg.classList.toggle("is-hidden", !next);
      svg.style.visibility = next ? "visible" : "hidden";
    },
    setLabels(on) {
      for (const id of map.labelLayerIds) {
        const layer = svg.getElementById(id);
        if (layer) (layer as HTMLElement | SVGElement).style.display = on ? "" : "none";
      }
    },
    setHighlight(selectedKey, hoverKey) {
      for (const region of map.regions) {
        const pathsForRegion = regionPaths.get(region.id) ?? [];
        const selected = Boolean(selectedKey) && region.organKey === selectedKey;
        const hot = Boolean(hoverKey) && region.organKey === hoverKey && !selected;
        for (const path of pathsForRegion) {
          path.classList.toggle("is-selected", selected);
          path.classList.toggle("is-hot", hot);
        }
      }
    },
    pick(clientX, clientY) {
      const stack = document.elementsFromPoint(clientX, clientY);
      let best: IrisRegion | null = null;
      const seen = new Set<string>();
      for (const node of stack) {
        const region = regionFrom(node);
        if (!region || seen.has(region.id)) continue;
        seen.add(region.id);
        if (!best || region.specificity < best.specificity) best = region;
      }
      return best?.organKey ?? null;
    },
  };
}

export async function exportIrisPng(options: {
  photoUrl: string;
  photoWidth: number;
  photoHeight: number;
  svg: SVGSVGElement;
  geom: ResolvedIrisGeometry;
  fit: IrisFit;
  opacity: number;
  overlayVisible: boolean;
}): Promise<Blob> {
  const photo = new Image();
  photo.src = options.photoUrl;
  await photo.decode();
  const canvas = document.createElement("canvas");
  canvas.width = options.photoWidth;
  canvas.height = options.photoHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo crear el lienzo de exportación.");
  ctx.drawImage(photo, 0, 0, options.photoWidth, options.photoHeight);

  if (options.overlayVisible && options.opacity > 0) {
    const clone = options.svg.cloneNode(true) as SVGSVGElement;
    clone.classList.remove("is-hidden");
    clone.style.visibility = "visible";
    clone.style.opacity = "1";
    clone.style.position = "static";
    clone.style.left = "0";
    clone.style.top = "0";
    clone.style.transform = "none";
    clone.style.width = `${options.geom.viewBox.width}px`;
    clone.style.height = `${options.geom.viewBox.height}px`;
    clone.setAttribute("width", String(options.geom.viewBox.width));
    clone.setAttribute("height", String(options.geom.viewBox.height));
    if (!clone.getAttribute("xmlns")) clone.setAttribute("xmlns", SVG_NS);
    const xml = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    try {
      const overlay = new Image();
      overlay.src = url;
      await overlay.decode();
      ctx.save();
      ctx.globalAlpha = Math.min(1, Math.max(0, options.opacity));
      const scale = options.fit.ri / options.geom.irisRadius;
      ctx.translate(options.fit.cx, options.fit.cy);
      ctx.rotate((options.fit.rotation * Math.PI) / 180);
      ctx.scale(scale, scale);
      ctx.translate(-options.geom.centerX, -options.geom.centerY);
      ctx.drawImage(
        overlay,
        options.geom.viewBox.minX,
        options.geom.viewBox.minY,
        options.geom.viewBox.width,
        options.geom.viewBox.height,
      );
      ctx.restore();
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!png) throw new Error("No se pudo generar el PNG.");
  return png;
}
