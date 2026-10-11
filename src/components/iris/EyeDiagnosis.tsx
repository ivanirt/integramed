"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { saveIrisNoteAction } from "@/lib/actions";
import { EyePane, emptySlot, slotView, type LoadedMap, type SlotState } from "@/components/iris/EyePane";
import { exportIrisPairPng, exportIrisPng, type IrisOverlayController, type IrisPngSide } from "@/components/iris/mountIrisOverlay";
import { cleanedPhotoBlob } from "@/components/iris/paintIrisClean";
import { clampIrisMask, defaultIrisMask, maskLimit } from "@/lib/iris-mask";
import { Button, GhostButton } from "@/components/ui";
import {
  irisMapUrl,
  lookupRegionInfo,
  mergeEyeCatalog,
  normalizeOrganKey,
  parseIrisMap,
  parseManifest,
  parseRegionInfo,
  type IrisCatalogEntry,
  type IrisEye,
  type RegionInfoEntry,
} from "@/lib/iris-map";
import { defaultFit, resolveGeometry } from "@/lib/iris-fit";

type EyeScope = "both" | IrisEye;
type OrganPick = { key: string; source: IrisEye | "list" };

const KIND_LABEL: Record<string, string> = {
  organ: "órgano",
  ring: "anillo",
  band: "banda",
};

const EYE_LABEL: Record<IrisEye, string> = {
  right: "Ojo derecho del paciente",
  left: "Ojo izquierdo del paciente",
};

function kindLabel(kind: string) {
  return KIND_LABEL[kind] || kind;
}

function organHighlight(
  eye: IrisEye,
  pick: OrganPick | null,
  scope: EyeScope,
  entry: IrisCatalogEntry | undefined,
): string | null {
  if (!pick || !entry?.eyes[eye]) return null;
  if (pick.source === "list") return scope === "both" || scope === eye ? pick.key : null;
  if (pick.source === eye) return pick.key;
  if (scope === "both") return pick.key;
  return null;
}

function onlyEye(entry: IrisCatalogEntry): IrisEye | null {
  if (entry.eyes.right && !entry.eyes.left) return "right";
  if (entry.eyes.left && !entry.eyes.right) return "left";
  return null;
}

export function EyeDiagnosis({
  patients,
  initialPatientId = "",
}: {
  patients: { id: string; name: string }[];
  initialPatientId?: string;
}) {
  const [maps, setMaps] = useState<Partial<Record<IrisEye, LoadedMap>>>({});
  const [mapErrors, setMapErrors] = useState<Partial<Record<IrisEye, string>>>({});
  const [loadingMaps, setLoadingMaps] = useState(true);
  const [info, setInfo] = useState<Record<string, RegionInfoEntry>>({});
  const [slots, setSlots] = useState<Record<IrisEye, SlotState>>({ right: emptySlot(), left: emptySlot() });
  const [scope, setScope] = useState<EyeScope>("both");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<OrganPick | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [hover, setHover] = useState<OrganPick | null>(null);
  const [patientId, setPatientId] = useState(initialPatientId);
  const [saveState, setSaveState] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [busy, setBusy] = useState<IrisEye | "pair" | "pair-original" | null>(null);
  const [maximized, setMaximized] = useState<null | "both" | IrisEye>(null);

  const slotsRef = useRef(slots);
  const mapsRef = useRef(maps);
  const ctrlRef = useRef<Record<IrisEye, IrisOverlayController | null>>({ right: null, left: null });
  const selectionRef = useRef<OrganPick | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const fullscreenRequested = useRef(false);
  slotsRef.current = slots;
  mapsRef.current = maps;

  const patchSlot = useCallback((eye: IrisEye, patch: Partial<SlotState> & { forPhoto?: string }) => {
    setSlots((prev) => {
      if (patch.forPhoto && prev[eye].photo?.url !== patch.forPhoto) return prev;
      const rest: Partial<SlotState> & { forPhoto?: string } = { ...patch };
      delete rest.forPhoto;
      const previousPhoto = prev[eye].photo;
      if (rest.photo && previousPhoto && previousPhoto.url !== rest.photo.url) {
        URL.revokeObjectURL(previousPhoto.url);
      }
      return { ...prev, [eye]: { ...prev[eye], ...rest } };
    });
  }, []);

  const onController = useCallback((eye: IrisEye, controller: IrisOverlayController | null) => {
    ctrlRef.current[eye] = controller;
  }, []);

  useEffect(() => {
    function onFullscreenChange() {
      if (!fullscreenElement() && fullscreenRequested.current) {
        fullscreenRequested.current = false;
        setMaximized(null);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape" || fullscreenElement()) return;
      setMaximized((current) => (current ? null : current));
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (!maximized) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [maximized]);

  useEffect(() => {
    const current = slotsRef;
    return () => {
      for (const eye of ["right", "left"] as const) {
        const photo = current.current[eye].photo;
        if (photo) URL.revokeObjectURL(photo.url);
      }
    };
  }, []);

  useEffect(() => {
    let cancel = false;
    fetch("/iris-maps/region-info.json", { cache: "no-cache" })
      .then((res) => (res.ok ? res.json() : {}))
      .then((raw) => {
        if (!cancel) setInfo(parseRegionInfo(raw));
      })
      .catch(() => {
        if (!cancel) setInfo({});
      });
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    let cancel = false;
    setLoadingMaps(true);
    fetch("/iris-maps/manifest.json", { cache: "no-cache" })
      .then(async (res) => {
        if (!res.ok) throw new Error("No se pudo leer el manifiesto de mapas (public/iris-maps/manifest.json).");
        const manifest = parseManifest(await res.json());
        const next: Partial<Record<IrisEye, LoadedMap>> = {};
        const errors: Partial<Record<IrisEye, string>> = {};
        for (const eye of ["right", "left"] as const) {
          try {
            const entry = manifest.eyes[eye];
            if (!entry) {
              throw new Error(
                eye === "right"
                  ? "El manifiesto no tiene un mapa para el ojo derecho."
                  : "El manifiesto no tiene un mapa para el ojo izquierdo.",
              );
            }
            const url = irisMapUrl(entry.file);
            if (!url) throw new Error("La ruta del SVG en el manifiesto no es segura. Usa un archivo dentro de iris-maps.");
            const svgRes = await fetch(url, { cache: "no-cache" });
            if (!svgRes.ok) throw new Error(`No se encontró ${entry.file}.`);
            const svg = await svgRes.text();
            const map = parseIrisMap(svg);
            if (!map.regions.length) {
              throw new Error(map.warnings[0] || "Ese SVG no tiene regiones con data-organ.");
            }
            next[eye] = {
              eye,
              svg,
              map,
              geom: resolveGeometry(map.geometry),
              entry,
              manifestVersion: manifest.version,
            };
          } catch (err) {
            errors[eye] = err instanceof Error ? err.message : "No se pudo cargar el mapa.";
          }
        }
        return { next, errors };
      })
      .then(({ next, errors }) => {
        if (cancel) return;
        setMaps(next);
        setMapErrors(errors);
      })
      .catch((err: unknown) => {
        if (cancel) return;
        const message = err instanceof Error ? err.message : "No se pudo cargar el mapa.";
        setMaps({});
        setMapErrors({ right: message, left: message });
      })
      .finally(() => {
        if (!cancel) setLoadingMaps(false);
      });
    return () => {
      cancel = true;
    };
  }, []);

  const catalog = useMemo(
    () => mergeEyeCatalog({ right: maps.right?.map.groups, left: maps.left?.map.groups }),
    [maps],
  );
  const byKey = useMemo(() => new Map(catalog.map((entry) => [entry.organKey, entry])), [catalog]);

  const filtered = useMemo(() => {
    const q = normalizeOrganKey(query);
    const raw = query.trim().toLowerCase();
    return catalog.filter((entry) => {
      if (scope === "right" && !entry.eyes.right) return false;
      if (scope === "left" && !entry.eyes.left) return false;
      if (!q && !raw) return true;
      const note = lookupRegionInfo(info, entry.organKey);
      const english = note?.en ? normalizeOrganKey(note.en) : "";
      return (
        entry.organKey.includes(q) ||
        english.includes(q) ||
        (raw && entry.number != null && String(entry.number).includes(raw)) ||
        entry.kinds.some((kind) => kind.includes(raw) || kindLabel(kind).includes(raw))
      );
    });
  }, [catalog, info, query, scope]);

  const selection =
    picked ?? (query.trim() && !dismissed && filtered.length === 1 ? { key: filtered[0].organKey, source: "list" as const } : null);
  selectionRef.current = selection;
  const selected = selection ? byKey.get(selection.key) ?? null : null;
  const selectedInfo = selected ? lookupRegionInfo(info, selected.organKey) : null;
  const selectedOnly = selected ? onlyEye(selected) : null;

  function choose(source: IrisEye | "list", key: string | null) {
    const current = selectionRef.current;
    if (key == null || (current?.key === key && (source === "list" || current.source === source || current.source === "list"))) {
      setPicked(null);
      setDismissed(true);
      return;
    }
    setDismissed(false);
    setPicked({ key, source });
  }

  function openMaximized(mode: "both" | IrisEye) {
    setMaximized(mode);
    const node = shellRef.current;
    if (!node) return;
    fullscreenRequested.current = true;
    void requestElementFullscreen(node).catch(() => {
      if (!fullscreenElement()) fullscreenRequested.current = false;
    });
  }

  function closeMaximized() {
    fullscreenRequested.current = false;
    const active = fullscreenElement();
    if (active) void exitElementFullscreen();
    setMaximized(null);
  }

  function swapPhotos() {
    setSlots((prev) => ({
      right: { ...prev.left, autoSuggest: false },
      left: { ...prev.right, autoSuggest: false },
    }));
  }

  async function sidePayload(
    eye: IrisEye,
    version: "active" | "original",
  ): Promise<{ side: IrisPngSide; version: "original" | "clean"; revoke?: () => void }> {
    const slot = slotsRef.current[eye];
    const map = mapsRef.current[eye];
    const chosen = version === "original" ? "original" : slotView(slot);
    let photoUrl = slot.photo?.url ?? null;
    let revoke: (() => void) | undefined;
    if (chosen === "clean" && slot.photo && slot.fit && slot.mask) {
      const blob = await cleanedPhotoBlob(
        slot.photo.url,
        slot.photo.width,
        slot.photo.height,
        slot.fit.cx,
        slot.fit.cy,
        slot.mask,
      );
      photoUrl = URL.createObjectURL(blob);
      revoke = () => URL.revokeObjectURL(photoUrl!);
    }
    return {
      version: chosen,
      revoke,
      side: {
        label: `${EYE_LABEL[eye]} · ${chosen === "clean" ? "Solo iris" : "Original"}`,
        photoUrl,
        photoWidth: slot.photo?.width ?? map?.geom.viewBox.width ?? 1200,
        photoHeight: slot.photo?.height ?? map?.geom.viewBox.height ?? 1200,
        svg: ctrlRef.current[eye]?.svg ?? null,
        geom: map?.geom ?? null,
        fit:
          slot.fit ??
          (map
            ? defaultFit(
                slot.photo?.width ?? map.geom.viewBox.width,
                slot.photo?.height ?? map.geom.viewBox.height,
                map.geom,
              )
            : null),
        opacity: slot.opacity,
        overlayVisible: slot.overlayVisible,
        pupilBlack: slot.pupilBlack,
      },
    };
  }

  async function onExportEye(eye: IrisEye, which: "active" | "other") {
    const slot = slotsRef.current[eye];
    const map = mapsRef.current[eye];
    const ctrl = ctrlRef.current[eye];
    if (!slot.photo || !slot.fit || !map || !ctrl) return;
    const active = slotView(slot);
    const version = which === "active" ? active : active === "clean" ? "original" : "clean";
    if (version === "clean" && !slot.mask) return;
    setBusy(eye);
    setExportError(null);
    let revoke: (() => void) | undefined;
    try {
      let photoUrl = slot.photo.url;
      if (version === "clean" && slot.mask) {
        const blob = await cleanedPhotoBlob(
          slot.photo.url,
          slot.photo.width,
          slot.photo.height,
          slot.fit.cx,
          slot.fit.cy,
          slot.mask,
        );
        photoUrl = URL.createObjectURL(blob);
        revoke = () => URL.revokeObjectURL(photoUrl);
      }
      const blob = await exportIrisPng({
        photoUrl,
        photoWidth: slot.photo.width,
        photoHeight: slot.photo.height,
        svg: ctrl.svg,
        geom: map.geom,
        fit: slot.fit,
        opacity: slot.opacity,
        overlayVisible: slot.overlayVisible,
        pupilBlack: slot.pupilBlack,
        caption: version === "clean" ? "Solo iris" : "Original",
      });
      const eyeName = eye === "right" ? "derecho" : "izquierdo";
      downloadBlob(blob, `iris-${eyeName}-${version === "clean" ? "limpia" : "original"}-${fileDate()}.png`);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "No se pudo exportar el PNG.");
    } finally {
      revoke?.();
      setBusy(null);
    }
  }

  async function onExportPair(version: "active" | "original") {
    if (!mapsRef.current.right && !mapsRef.current.left) return;
    setBusy(version === "original" ? "pair-original" : "pair");
    setExportError(null);
    const prepared = await Promise.all([sidePayload("right", version), sidePayload("left", version)]);
    try {
      const blob = await exportIrisPairPng({ right: prepared[0].side, left: prepared[1].side });
      const tag = prepared.every((item) => item.version === "clean")
        ? "limpia"
        : prepared.every((item) => item.version === "original")
          ? "original"
          : "mixta";
      downloadBlob(blob, `iris-ambos-${tag}-${fileDate()}.png`);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "No se pudo exportar el PNG.");
    } finally {
      for (const item of prepared) item.revoke?.();
      setBusy(null);
    }
  }

  function setEyesView(view: "original" | "clean") {
    setSlots((prev) => {
      const next = { ...prev };
      for (const eye of ["right", "left"] as const) {
        const slot = prev[eye];
        if (!slot.photo || !slot.fit) continue;
        if (view === "original") {
          next[eye] = { ...slot, view: "original" };
          continue;
        }
        const linked = slot.mask ? slot.maskLinked : true;
        const base = slot.mask ?? defaultIrisMask(slot.fit.ri);
        next[eye] = {
          ...slot,
          view: "clean",
          maskLinked: linked,
          mask: clampIrisMask(
            { ...base, radius: linked ? slot.fit.ri : base.radius },
            maskLimit(slot.photo.width, slot.photo.height),
          ),
        };
      }
      return next;
    });
  }

  async function onSaveNote() {
    if (!patientId) return;
    setSaveState(null);
    const eyes = selected
      ? (["right", "left"] as const).filter((eye) => selected.eyes[eye])
      : (["right", "left"] as const).filter((eye) => maps[eye]);
    try {
      await saveIrisNoteAction({
        patientId,
        eye: eyes[0] ?? "right",
        eyes,
        organ: selected?.organ,
        kind: selected?.kinds.map(kindLabel).join(", "),
        inferred: selected?.inferred,
        mapLabel: eyes
          .map((eye) => {
            const entry = maps[eye]?.entry;
            return entry ? [entry.displayName, entry.version].filter(Boolean).join(" ") : "";
          })
          .filter(Boolean)
          .join(" · "),
      });
      setSaveState("Nota guardada en Estudios. La foto no se adjuntó.");
    } catch (err) {
      setSaveState(err instanceof Error ? err.message : "No se pudo guardar la nota.");
    }
  }

  const scopeLabel =
    scope === "both" ? "en los dos mapas" : scope === "right" ? "en el ojo derecho" : "en el ojo izquierdo";
  const canClean = (["right", "left"] as const).some((eye) => slots[eye].photo && slots[eye].fit);
  const anyClean = (["right", "left"] as const).some((eye) => slotView(slots[eye]) === "clean");

  return (
    <div className="mx-auto max-w-[88rem] px-4 py-10">
      <p className="text-xs uppercase tracking-wide text-[#6D5E52]">Análisis orientativo</p>
      <h1 className="font-serif text-4xl">Revisión iridológica</h1>
      <p className="mt-3 max-w-3xl border border-[#EADBCE] bg-white px-4 py-3 text-sm leading-relaxed">
        La iridología es una técnica complementaria y no validada. Lo que muestra este módulo no es un diagnóstico
        médico. La fotografía no sale de este navegador.
      </p>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#6D5E52]">
        Los dos ojos se ven como al mirar la cara del paciente: su ojo derecho queda a la izquierda de la pantalla y su
        ojo izquierdo a la derecha. En pantallas estrechas el ojo derecho queda arriba. Cada foto pertenece a la ranura
        donde la pongas. Si cae en la otra, muévela o intercambia las fotos. Con una sola foto, el otro ojo sigue
        mostrando su mapa. Ampliar pone un ojo, o los dos, a pantalla completa; Esc o Cerrar vuelve a la página. Limpiar
        imagen deja solo el anillo del iris sobre un fondo gris; la foto original sigue disponible.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          disabled={loadingMaps || (!maps.right && !maps.left) || busy === "pair"}
          onClick={() => void onExportPair("active")}
        >
          {busy === "pair" ? "Exportando…" : anyClean ? "Descargar ambos (vista actual)" : "Descargar ambos ojos"}
        </Button>
        {anyClean ? (
          <GhostButton type="button" disabled={busy === "pair-original"} onClick={() => void onExportPair("original")}>
            {busy === "pair-original" ? "Exportando…" : "Descargar ambos originales"}
          </GhostButton>
        ) : null}
        <GhostButton type="button" disabled={!canClean} onClick={() => setEyesView("clean")}>
          Solo iris en ambos
        </GhostButton>
        <GhostButton type="button" disabled={!canClean} onClick={() => setEyesView("original")}>
          Original en ambos
        </GhostButton>
        <GhostButton type="button" onClick={() => openMaximized("both")}>
          Ampliar ambos ojos
        </GhostButton>
        {exportError ? <p className="text-sm text-red-800">{exportError}</p> : null}
      </div>

      <div
        ref={shellRef}
        data-maximized={maximized ?? "off"}
        className={
          maximized
            ? "fixed inset-0 z-50 flex h-full w-full flex-col overflow-hidden bg-[#FAF7F2] p-3 [&:fullscreen]:bg-[#FAF7F2]"
            : undefined
        }
      >
        {maximized ? (
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="font-serif text-2xl">
              {maximized === "both" ? "Ambos ojos" : EYE_LABEL[maximized]}
            </p>
            <div className="flex flex-wrap gap-2">
              <GhostButton type="button" disabled={!canClean} onClick={() => setEyesView("clean")}>
                Solo iris en ambos
              </GhostButton>
              <GhostButton type="button" disabled={!canClean} onClick={() => setEyesView("original")}>
                Original en ambos
              </GhostButton>
              {maximized !== "both" ? (
                <GhostButton type="button" onClick={() => openMaximized("both")}>
                  Ampliar ambos ojos
                </GhostButton>
              ) : null}
              <Button type="button" onClick={closeMaximized}>
                Cerrar
              </Button>
            </div>
          </div>
        ) : null}
      <div
        className={
          maximized
            ? `grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-auto md:h-full md:grid-rows-[minmax(0,1fr)] md:overflow-hidden ${
                maximized === "both"
                  ? "md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_18rem]"
                  : "md:grid-cols-[minmax(0,1fr)_18rem]"
              }`
            : "mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_20rem]"
        }
      >
        {(["right", "left"] as const).map((eye) => (
          <EyePane
            key={eye}
            eye={eye}
            label={EYE_LABEL[eye]}
            loaded={maps[eye] ?? null}
            mapError={mapErrors[eye] ?? null}
            loading={loadingMaps}
            slot={slots[eye]}
            onSlot={(patch) => patchSlot(eye, patch)}
            highlightKey={organHighlight(eye, selection, scope, selection ? byKey.get(selection.key) : undefined)}
            hoverKey={organHighlight(eye, hover, scope, hover ? byKey.get(hover.key) : undefined)}
            onHover={(key) =>
              setHover((prev) => {
                if (key == null) return prev?.source === eye ? null : prev;
                if (prev?.key === key && prev.source === eye) return prev;
                return { key, source: eye };
              })
            }
            onPick={(key) => choose(eye, key)}
            otherHasPhoto={Boolean(slots[eye === "right" ? "left" : "right"].photo)}
            onSwap={swapPhotos}
            onExport={(which) => void onExportEye(eye, which)}
            busyExport={busy === eye}
            onController={(controller) => onController(eye, controller)}
            expanded={maximized === "both" || maximized === eye}
            concealed={maximized !== null && maximized !== "both" && maximized !== eye}
            onMaximize={() => openMaximized(eye)}
          />
        ))}

        <aside
          className={
            maximized
              ? "flex h-full min-h-0 flex-col overflow-hidden border border-[#EADBCE] bg-white"
              : "min-w-0 border border-[#EADBCE] bg-white lg:sticky lg:top-4"
          }
        >
          <div className="border-b border-[#EADBCE] px-4 py-3">
            <h2 className="font-serif text-2xl">Regiones</h2>
            <p className="mt-1 text-xs text-[#6D5E52]">
              {loadingMaps ? "Cargando mapas…" : `${filtered.length} áreas ${scopeLabel}`}
            </p>
            <div className="mt-3 flex border border-[#EADBCE]" role="group" aria-label="En qué ojo buscar">
              {(
                [
                  ["both", "Ambos"],
                  ["right", "Derecho"],
                  ["left", "Izquierdo"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={scope === value}
                  onClick={() => setScope(value)}
                  className={`flex-1 px-2 py-1.5 text-sm ${scope === value ? "bg-[#241B16] text-[#FAF7F2]" : "text-[#241B16]"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-[#6D5E52]">
              La búsqueda resalta el mismo órgano en los dos ojos. Derecho o Izquierdo limita la lista y el resalte.
            </p>
          </div>
          <div className="px-4 py-3" aria-live="polite">
            {selected ? (
              <div>
                <p className="text-xs uppercase tracking-wide text-[#6D5E52]">
                  {selected.kinds.map(kindLabel).join(" · ")}
                  {selected.number != null ? ` · #${selected.number}` : ""}
                  {` · ${(selected.eyes.right?.ids.length ?? 0) + (selected.eyes.left?.ids.length ?? 0)} partes`}
                </p>
                <p className="mt-1 font-serif text-2xl">{selected.organ}</p>
                {selectedInfo?.en ? <p className="text-sm text-[#6D5E52]">{selectedInfo.en}</p> : null}
                <p className="mt-2 text-sm text-[#6D5E52]">
                  {selected.eyes.right && selected.eyes.left
                    ? "Está en el mapa del ojo derecho y en el del ojo izquierdo."
                    : null}
                  {selectedOnly
                    ? `Este órgano solo está en el mapa del ${selectedOnly === "right" ? "ojo derecho" : "ojo izquierdo"} del paciente.`
                    : null}
                </p>
                {selected.inferred ? (
                  <p className="mt-2 text-sm">
                    {inferredSentence(selected)}
                  </p>
                ) : null}
                {selectedInfo?.note ? <p className="mt-2 text-sm text-[#6D5E52]">{selectedInfo.note}</p> : null}
                <button
                  type="button"
                  className="mt-3 text-xs text-[#6D5E52] underline"
                  onClick={() => {
                    setPicked(null);
                    setDismissed(true);
                  }}
                >
                  Quitar selección
                </button>
              </div>
            ) : (
              <p className="text-sm text-[#6D5E52]">
                Pulsa una zona de un mapa o una fila de la lista. El mismo órgano se marca en el otro ojo cuando el
                filtro está en Ambos. Volver a pulsar lo quita.
              </p>
            )}
          </div>
          <div className="px-4 pb-3">
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPicked(null);
                setDismissed(false);
              }}
              placeholder="Buscar órgano en los dos ojos"
              className="w-full border border-[#EADBCE] px-3 py-2 text-sm"
              aria-label="Buscar región"
            />
          </div>
          <ul
            className={`${maximized ? "min-h-0 flex-1" : "max-h-[32rem]"} overflow-auto border-t border-[#EADBCE] text-sm`}
          >
            {filtered.length === 0 ? (
              <li className="px-4 py-6 text-[#6D5E52]">Ninguna región coincide.</li>
            ) : (
              filtered.map((entry) => {
                const active = entry.organKey === selection?.key;
                const note = lookupRegionInfo(info, entry.organKey);
                const where =
                  entry.eyes.right && entry.eyes.left
                    ? "ambos ojos"
                    : entry.eyes.right
                      ? "solo ojo derecho"
                      : "solo ojo izquierdo";
                return (
                  <li key={entry.organKey}>
                    <button
                      type="button"
                      className={`block w-full px-4 py-2 text-left ${active ? "bg-[#241B16] text-[#FAF7F2]" : "hover:bg-[#FAF7F2]"}`}
                      onClick={() => choose("list", entry.organKey)}
                      onMouseEnter={() => setHover({ key: entry.organKey, source: "list" })}
                      onMouseLeave={() => setHover((prev) => (prev?.source === "list" && prev.key === entry.organKey ? null : prev))}
                    >
                      <span className="block">
                        {entry.number != null ? <span className="mr-2 text-xs opacity-70">{entry.number}</span> : null}
                        {entry.organ}
                      </span>
                      <span className={`mt-0.5 block text-xs ${active ? "text-[#EADBCE]" : "text-[#6D5E52]"}`}>
                        {where}
                        {entry.kinds.map((kind) => ` · ${kindLabel(kind)}`).join("")}
                        {entry.inferred ? " · inferida" : ""}
                        {note?.en ? ` · ${note.en}` : ""}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </aside>
      </div>
      </div>

      {patients.length || patientId ? (
        <div className="mt-6 border border-[#EADBCE] bg-white p-4 text-sm">
          <p className="text-[#241B16]">Ficha del paciente</p>
          <p className="mt-1 text-[#6D5E52]">
            Guarda una nota de texto en Estudios. La imagen no se envía al servidor ni a ningún servicio externo.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="min-w-48 flex-1">
              Paciente
              <select
                className="mt-1 w-full border border-[#EADBCE] bg-white px-3 py-2"
                value={patientId}
                onChange={(event) => setPatientId(event.target.value)}
              >
                <option value="">Ninguno</option>
                {patientId && !patients.some((patient) => patient.id === patientId) ? (
                  <option value={patientId}>{patientId}</option>
                ) : null}
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name}
                  </option>
                ))}
              </select>
            </label>
            <GhostButton type="button" disabled={!patientId} onClick={() => void onSaveNote()}>
              Anotar en la ficha
            </GhostButton>
          </div>
          {saveState ? <p className="mt-2 text-[#6D5E52]">{saveState}</p> : null}
        </div>
      ) : (
        <p className="mt-6 text-sm text-[#6D5E52]">
          No hay pacientes cargados. Puedes alinear y exportar igual; la foto sigue en este navegador.
        </p>
      )}
    </div>
  );
}

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

function fullscreenElement() {
  const doc = document as Document & { webkitFullscreenElement?: Element | null };
  return document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

function requestElementFullscreen(node: HTMLElement) {
  const target = node as FullscreenElement;
  if (typeof node.requestFullscreen === "function") return node.requestFullscreen();
  if (typeof target.webkitRequestFullscreen === "function") {
    return Promise.resolve(target.webkitRequestFullscreen());
  }
  return Promise.reject(new Error("fullscreen"));
}

function exitElementFullscreen() {
  const doc = document as Document & { webkitExitFullscreen?: () => Promise<void> | void };
  if (typeof document.exitFullscreen === "function" && document.fullscreenElement) return document.exitFullscreen();
  if (typeof doc.webkitExitFullscreen === "function") return Promise.resolve(doc.webkitExitFullscreen());
  return Promise.resolve();
}

function inferredSentence(entry: IrisCatalogEntry) {
  const right = entry.eyes.right?.inferred;
  const left = entry.eyes.left?.inferred;
  if (right && left) return "En los dos mapas la ubicación está marcada como inferida, no leída directamente del gráfico.";
  if (right) return "En el ojo derecho la ubicación está marcada como inferida, no leída directamente del gráfico.";
  if (left) return "En el ojo izquierdo la ubicación está marcada como inferida, no leída directamente del gráfico.";
  return "Ubicación inferida en el mapa, no leída directamente del gráfico.";
}

function fileDate() {
  return new Date().toISOString().slice(0, 10);
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}
