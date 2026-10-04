import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import {
  groupRegions,
  irisMapUrl,
  lookupRegionInfo,
  normalizeOrganKey,
  parseIrisMap,
  parseManifest,
  parseRegionInfo,
  pickMostSpecific,
  regionSpecificity,
  type IrisRegion,
} from "./iris-map";

const root = process.cwd();
const rightSvg = readFileSync(path.join(root, "public/iris-maps/ojo_derecho_v7.svg"), "utf8");
const leftSvg = readFileSync(path.join(root, "public/iris-maps/ojo_izquierdo_v1.svg"), "utf8");

function region(partial: Partial<IrisRegion> & Pick<IrisRegion, "id" | "organ" | "kind">): IrisRegion {
  const base = {
    organKey: normalizeOrganKey(partial.organ),
    number: partial.number ?? null,
    inferred: partial.inferred ?? false,
    angleStart: partial.angleStart ?? null,
    angleEnd: partial.angleEnd ?? null,
    rMin: partial.rMin ?? null,
    rMax: partial.rMax ?? null,
    ...partial,
  };
  return { ...base, specificity: regionSpecificity(base) };
}

test("sample SVGs expose organs, geometry and label layers", () => {
  const right = parseIrisMap(rightSvg);
  const left = parseIrisMap(leftSvg);

  assert.ok(right.regions.length > 40);
  assert.ok(left.regions.length > 40);
  assert.ok(right.regions.every((item) => item.id && item.organ && item.kind));
  assert.ok(left.regions.every((item) => item.id && item.organ && item.kind));

  const stomach = right.regions.find((item) => item.organ === "ESTOMAGO");
  const colon = right.regions.find((item) => item.organ === "COLON TRANSVERSO");
  const skin = right.regions.find((item) => item.organ === "PIEL");
  assert.ok(stomach);
  assert.equal(stomach.inferred, false);
  assert.equal(colon?.inferred, true);
  assert.equal(colon?.kind, "organ");
  assert.equal(skin?.kind, "ring");
  assert.ok(left.regions.some((item) => item.organ === "CORAZON"));
  assert.ok(left.regions.some((item) => item.organ === "COLON DESCENDENTE"));

  const mes = right.groups.find((group) => group.organ === "MES");
  assert.ok(mes && mes.ids.length >= 2);

  assert.equal(right.geometry.viewBox?.width, 1200);
  assert.equal(right.geometry.viewBox?.height, 1200);
  assert.equal(left.geometry.centerX, 600);
  assert.equal(left.geometry.centerY, 600);
  assert.equal(right.geometry.pupilRadius, 100);
  assert.equal(left.geometry.pupilRadius, 100);
  assert.ok(right.geometry.irisRadius != null && Math.abs(right.geometry.irisRadius - 500) < 1);
  assert.ok(left.geometry.irisRadius != null && Math.abs(left.geometry.irisRadius - 500) < 1);

  assert.ok(right.labelLayerIds.includes("g_leyenda"));
  assert.ok(right.labelLayerIds.some((id) => id.startsWith("g_etiquetas")));
  assert.ok(left.labelLayerIds.includes("g_leyenda"));
  assert.equal(right.labelLayerIds.includes("g197"), false);
});

test("duplicate organ names group together and rings lose to a smaller organ", () => {
  const organ = region({
    id: "a",
    organ: "HÍGADO",
    kind: "organ",
    angleStart: 10,
    angleEnd: 20,
    rMin: 300,
    rMax: 440,
  });
  const same = region({
    id: "b",
    organ: "HIGADO",
    kind: "organ",
    number: 4,
    angleStart: 20,
    angleEnd: 30,
    rMin: 300,
    rMax: 440,
  });
  const ring = region({
    id: "c",
    organ: "PIEL",
    kind: "ring",
    angleStart: 0,
    angleEnd: 360,
    rMin: 500,
    rMax: 500,
  });
  assert.equal(organ.organKey, same.organKey);
  const groups = groupRegions([same, organ]);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].ids, ["b", "a"]);
  assert.equal(pickMostSpecific([ring, organ, same])?.id, "a");
  assert.ok(organ.specificity < ring.specificity);
});

test("parser tolerates extra attributes, missing fields and a bad file", () => {
  const svg = `<?xml version="1.0"?>
    <svg viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg">
      <circle id="pupila" class="pupil" cx="600" cy="600" r="100" />
      <g id="g_regiones">
        <g id="reg_1" data-organ="BAZO" data-kind="organ" data-region="3" data-extra="keep" data-angle-start="1" data-angle-end="12" data-r-min="200" data-r-max="400">
          <path class="region" d="M0 0 L1 1 Z" />
        </g>
        <g id="reg_2" data-organ="BAZO" data-inferred="true" data-r-min="nope">
          <path d="M0 0 L2 2 Z" />
        </g>
      </g>
      <g id="g_leyenda" inkscape:groupmode="layer" inkscape:label="Titulo y leyenda"></g>
    </svg>`;
  const map = parseIrisMap(svg);
  assert.equal(map.regions.length, 2);
  assert.equal(map.regions[1].kind, "organ");
  assert.equal(map.regions[1].inferred, true);
  assert.equal(map.regions[1].rMin, null);
  assert.equal(map.groups[0].ids.length, 2);
  assert.equal(map.groups[0].inferred, true);
  assert.equal(map.geometry.pupilRadius, 100);
  assert.ok(map.labelLayerIds.includes("g_leyenda"));

  const broken = parseIrisMap("esto no es un mapa");
  assert.equal(broken.regions.length, 0);
  assert.ok(broken.warnings.length > 0);

  const empty = parseIrisMap("<svg viewBox='0 0 100 100'></svg>");
  assert.equal(empty.regions.length, 0);
  assert.ok(empty.warnings.some((warning) => warning.includes("data-organ")));
});

test("manifest and region notes stay optional", () => {
  const manifest = parseManifest({
    version: "v9",
    eyes: {
      right: { file: "ojo_derecho_v7.svg", displayName: "OD", version: "v7" },
      left: { svg: "ojo_izquierdo_v1.svg" },
      both: { file: "nope.svg" },
    },
  });
  assert.equal(manifest.version, "v9");
  assert.equal(manifest.eyes.right?.displayName, "OD");
  assert.equal(manifest.eyes.left?.file, "ojo_izquierdo_v1.svg");
  assert.equal(manifest.eyes.left?.displayName, "Ojo izquierdo");
  assert.equal(irisMapUrl("ojo_derecho_v7.svg"), "/iris-maps/ojo_derecho_v7.svg");
  assert.equal(irisMapUrl("../secret.svg"), null);
  assert.equal(irisMapUrl("https://example.com/a.svg"), null);
  assert.equal(irisMapUrl("/etc/passwd"), null);

  const notes = parseRegionInfo({
    _comment: "ignored",
    Estómago: { en: "Stomach", note: "Zona del mapa." },
    vacio: { foo: "no" },
  });
  assert.deepEqual(lookupRegionInfo(notes, "ESTOMAGO"), { en: "Stomach", note: "Zona del mapa." });
  assert.equal(lookupRegionInfo(notes, "PIEL"), null);
  assert.equal(normalizeOrganKey("RIÑÓN"), "rinon");
});
