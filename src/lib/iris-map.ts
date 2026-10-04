/**
 * Iris map adapter.
 *
 * The Iris Map Builder exports SVGs that keep changing. This module is the
 * only place that knows the current file contract: manifest entries, region
 * attributes, and how label layers are recognized. Geometry and organ names
 * are discovered from the files, not hardcoded.
 */

export type IrisEye = "right" | "left";

export type IrisRegion = {
  id: string;
  organ: string;
  organKey: string;
  kind: string;
  number: number | null;
  inferred: boolean;
  angleStart: number | null;
  angleEnd: number | null;
  rMin: number | null;
  rMax: number | null;
  /** Lower means more specific. Rings and bands sort after organs. */
  specificity: number;
};

export type IrisRegionGroup = {
  organKey: string;
  organ: string;
  ids: string[];
  kinds: string[];
  inferred: boolean;
  number: number | null;
};

export type IrisViewBox = { minX: number; minY: number; width: number; height: number };

export type IrisGeometry = {
  viewBox: IrisViewBox | null;
  centerX: number | null;
  centerY: number | null;
  pupilRadius: number | null;
  irisRadius: number | null;
};

export type IrisMap = {
  regions: IrisRegion[];
  groups: IrisRegionGroup[];
  geometry: IrisGeometry;
  labelLayerIds: string[];
  warnings: string[];
};

export type IrisManifestEye = {
  file: string;
  displayName: string;
  version?: string;
};

export type IrisManifest = {
  version?: string;
  eyes: Partial<Record<IrisEye, IrisManifestEye>>;
};

export type RegionInfoEntry = {
  en?: string;
  note?: string;
};

const EYES: IrisEye[] = ["right", "left"];

const KIND_PENALTY: Record<string, number> = {
  ring: 1e15,
  band: 1e12,
};

const LABEL_ID = /^(?:g_leyenda|g_etiquetas(?:_|$)|g_et_)/i;
const LABEL_NAME = /etiqueta|leyenda|t[ií]tulo/i;

export function normalizeOrganKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function angleSpanDegrees(start: number | null, end: number | null): number | null {
  if (start == null || end == null || !Number.isFinite(start) || !Number.isFinite(end)) return null;
  const raw = end - start;
  if (raw >= 359.5) return 360;
  let span = raw;
  if (span <= 0) span += 360;
  if (span > 360) span = 360;
  if (span < 0.05) return 360;
  return span;
}

export function regionSpecificity(
  region: Pick<IrisRegion, "kind" | "angleStart" | "angleEnd" | "rMin" | "rMax">,
): number {
  const span = angleSpanDegrees(region.angleStart, region.angleEnd) ?? 360;
  const a = region.rMin ?? 0;
  const b = region.rMax ?? a;
  const outer = Math.max(a, b);
  const inner = Math.min(a, b);
  const thickness = Math.max(outer - inner, Math.max(outer, 1) * 0.015, 1);
  const rOuter = inner === outer ? outer + thickness / 2 : outer;
  const rInner = inner === outer ? Math.max(0, outer - thickness / 2) : inner;
  const area = (span / 360) * Math.PI * (rOuter * rOuter - rInner * rInner);
  return (KIND_PENALTY[region.kind] ?? 0) + area;
}

export function pickMostSpecific(regions: IrisRegion[]): IrisRegion | null {
  if (!regions.length) return null;
  return regions.reduce((best, region) => (region.specificity < best.specificity ? region : best));
}

export function groupRegions(regions: IrisRegion[]): IrisRegionGroup[] {
  const groups = new Map<string, IrisRegionGroup>();
  for (const region of regions) {
    const key = region.organKey || region.id;
    let group = groups.get(key);
    if (!group) {
      group = {
        organKey: key,
        organ: region.organ,
        ids: [],
        kinds: [],
        inferred: false,
        number: region.number,
      };
      groups.set(key, group);
    }
    group.ids.push(region.id);
    if (!group.kinds.includes(region.kind)) group.kinds.push(region.kind);
    if (region.inferred) group.inferred = true;
    if (region.number != null && (group.number == null || region.number < group.number)) {
      group.number = region.number;
    }
  }
  return [...groups.values()].sort(
    (a, b) => (a.number ?? 9999) - (b.number ?? 9999) || a.organ.localeCompare(b.organ, "es"),
  );
}

function parseAttrs(source: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([:\w.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source))) {
    attrs[match[1]] = match[2] ?? match[3] ?? "";
  }
  return attrs;
}

function parseNumber(value: string | undefined): number | null {
  if (value == null || value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function isInferred(value: string | undefined): boolean {
  if (!value) return false;
  const flag = value.trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes" || flag === "si" || flag === "sí";
}

function parseViewBox(svgTag: string): IrisViewBox | null {
  const attrs = parseAttrs(svgTag);
  if (attrs.viewBox) {
    const parts = attrs.viewBox
      .trim()
      .split(/[\s,]+/)
      .map((part) => Number(part));
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n)) && parts[2] > 0 && parts[3] > 0) {
      return { minX: parts[0], minY: parts[1], width: parts[2], height: parts[3] };
    }
  }
  const width = parseNumber(attrs.width);
  const height = parseNumber(attrs.height);
  if (width && height && width > 0 && height > 0) return { minX: 0, minY: 0, width, height };
  return null;
}

function arcRadii(d: string): number[] {
  const radii: number[] = [];
  const re = /[Aa]\s*([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(?:[\s,]+)([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(d))) {
    const rx = Number(match[1]);
    const ry = Number(match[2]);
    if (!Number.isFinite(rx) || !Number.isFinite(ry)) continue;
    if (Math.abs(rx - ry) <= Math.max(1, Math.abs(rx) * 0.02)) radii.push((rx + ry) / 2);
  }
  return radii;
}

function discoverGeometry(svgText: string, regions: IrisRegion[], warnings: string[]): IrisGeometry {
  const svgTag = svgText.match(/<svg\b[^>]*>/i)?.[0] ?? "";
  const viewBox = svgTag ? parseViewBox(svgTag) : null;
  if (!viewBox) warnings.push("El SVG no trae un viewBox utilizable.");

  let centerX: number | null = null;
  let centerY: number | null = null;
  let pupilRadius: number | null = null;
  const circleRe = /<circle\b[^>]*>/gi;
  let circleMatch: RegExpExecArray | null;
  while ((circleMatch = circleRe.exec(svgText))) {
    const attrs = parseAttrs(circleMatch[0]);
    const className = attrs.class || "";
    const isPupil = /\bpupil\b/.test(className) || attrs.id === "pupila";
    if (!isPupil && pupilRadius != null) continue;
    const cx = parseNumber(attrs.cx);
    const cy = parseNumber(attrs.cy);
    const r = parseNumber(attrs.r);
    if (cx == null || cy == null || r == null || r <= 0) continue;
    if (isPupil || pupilRadius == null) {
      centerX = cx;
      centerY = cy;
      pupilRadius = r;
    }
    if (isPupil) break;
  }
  if (pupilRadius == null) warnings.push("No se encontró el círculo de la pupila (class pupil / id pupila).");

  const ringRadii: number[] = [];
  const ringRe = /<(?:path|circle|ellipse)\b[^>]*\bclass="[^"]*\bring[^"]*"[^>]*>/gi;
  let ringMatch: RegExpExecArray | null;
  while ((ringMatch = ringRe.exec(svgText))) {
    const attrs = parseAttrs(ringMatch[0]);
    const r = parseNumber(attrs.r);
    if (r != null && r > 0) ringRadii.push(r);
    if (attrs.d) ringRadii.push(...arcRadii(attrs.d));
  }
  let irisRadius = ringRadii.length ? Math.max(...ringRadii) : null;
  if (irisRadius == null) {
    const fromRegions = regions
      .map((region) => region.rMax)
      .filter((value): value is number => value != null && value > 0);
    if (fromRegions.length) {
      irisRadius = Math.max(...fromRegions);
      warnings.push("El radio exterior se tomó de data-r-max porque no hay aros con class ring.");
    }
  }
  if (irisRadius == null) warnings.push("No se pudo leer el radio exterior del iris.");
  if (centerX == null || centerY == null) {
    if (viewBox) {
      centerX = viewBox.minX + viewBox.width / 2;
      centerY = viewBox.minY + viewBox.height / 2;
      warnings.push("El centro se aproximó al centro del viewBox.");
    }
  }

  return { viewBox, centerX, centerY, pupilRadius, irisRadius };
}

function discoverLabelLayers(svgText: string): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  const re = /<g\b[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(svgText))) {
    const attrs = parseAttrs(match[0]);
    const id = attrs.id || "";
    const label = attrs["inkscape:label"] || "";
    if (!id || seen.has(id)) continue;
    if (LABEL_ID.test(id) || LABEL_NAME.test(label)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

export function parseIrisMap(svgText: string): IrisMap {
  const warnings: string[] = [];
  const source = svgText.replace(/^\uFEFF/, "");
  if (!/<\s*svg\b/i.test(source)) {
    warnings.push("El archivo no parece un SVG.");
    return {
      regions: [],
      groups: [],
      geometry: { viewBox: null, centerX: null, centerY: null, pupilRadius: null, irisRadius: null },
      labelLayerIds: [],
      warnings,
    };
  }

  const regions: IrisRegion[] = [];
  const seenIds = new Set<string>();
  const re = /<g\b[^>]*>/gi;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = re.exec(source))) {
    const attrs = parseAttrs(match[0]);
    if (!("data-organ" in attrs) && !("data-region" in attrs)) continue;
    index += 1;
    const organ = (attrs["data-organ"] || attrs["inkscape:label"] || attrs.id || `Región ${index}`).trim();
    if (!attrs["data-organ"]) warnings.push(`Una región no trae data-organ (se usa «${organ}»).`);
    let id = (attrs.id || `region_${index}`).trim();
    if (seenIds.has(id)) {
      warnings.push(`Id de región repetido: ${id}.`);
      id = `${id}__${index}`;
    }
    seenIds.add(id);
    const kind = (attrs["data-kind"] || "organ").trim().toLowerCase() || "organ";
    const regionBase = {
      id,
      organ,
      organKey: normalizeOrganKey(organ) || id,
      kind,
      number: parseNumber(attrs["data-region"] || attrs["data-number"]),
      inferred: isInferred(attrs["data-inferred"]),
      angleStart: parseNumber(attrs["data-angle-start"]),
      angleEnd: parseNumber(attrs["data-angle-end"]),
      rMin: parseNumber(attrs["data-r-min"]),
      rMax: parseNumber(attrs["data-r-max"]),
    };
    regions.push({ ...regionBase, specificity: regionSpecificity(regionBase) });
  }

  if (!regions.length) {
    warnings.push("El SVG no tiene regiones con data-organ. No se puede inspeccionar el mapa.");
  }

  const geometry = discoverGeometry(source, regions, warnings);
  return {
    regions,
    groups: groupRegions(regions),
    geometry,
    labelLayerIds: discoverLabelLayers(source),
    warnings,
  };
}

export function parseManifest(raw: unknown): IrisManifest {
  const eyes: IrisManifest["eyes"] = {};
  if (!raw || typeof raw !== "object") return { eyes };
  const obj = raw as Record<string, unknown>;
  const version = typeof obj.version === "string" ? obj.version : undefined;
  const source =
    obj.eyes && typeof obj.eyes === "object" ? (obj.eyes as Record<string, unknown>) : (obj as Record<string, unknown>);
  for (const eye of EYES) {
    const entry = source[eye];
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const file =
      typeof record.file === "string"
        ? record.file
        : typeof record.svg === "string"
          ? record.svg
          : typeof record.path === "string"
            ? record.path
            : "";
    if (!file.trim()) continue;
    eyes[eye] = {
      file: file.trim(),
      displayName:
        typeof record.displayName === "string" && record.displayName.trim()
          ? record.displayName.trim()
          : eye === "right"
            ? "Ojo derecho"
            : "Ojo izquierdo",
      version: typeof record.version === "string" ? record.version : undefined,
    };
  }
  return { version, eyes };
}

/** Public URL for a manifest file. Rejects remote and parent-path entries. */
export function irisMapUrl(file: string, base = "/iris-maps"): string | null {
  const cleaned = file.trim().replace(/^\.\//, "");
  if (!cleaned || cleaned.includes("..") || cleaned.startsWith("/") || cleaned.includes("\\")) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(cleaned)) return null;
  if (!/^[\w./-]+$/.test(cleaned)) return null;
  return `${base.replace(/\/$/, "")}/${cleaned}`;
}

export function parseRegionInfo(raw: unknown): Record<string, RegionInfoEntry> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const table: Record<string, RegionInfoEntry> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!key || key.startsWith("_")) continue;
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const record = value as Record<string, unknown>;
    const en =
      typeof record.en === "string"
        ? record.en.trim()
        : typeof record.nameEn === "string"
          ? record.nameEn.trim()
          : "";
    const note =
      typeof record.note === "string"
        ? record.note.trim()
        : typeof record.description === "string"
          ? record.description.trim()
          : "";
    if (!en && !note) continue;
    table[normalizeOrganKey(key)] = {
      ...(en ? { en } : {}),
      ...(note ? { note } : {}),
    };
  }
  return table;
}

export function lookupRegionInfo(
  table: Record<string, RegionInfoEntry>,
  organOrKey: string,
): RegionInfoEntry | null {
  return table[normalizeOrganKey(organOrKey)] ?? null;
}
