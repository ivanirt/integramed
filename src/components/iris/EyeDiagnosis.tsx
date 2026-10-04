"use client";

import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { saveIrisNoteAction } from "@/lib/actions";
import {
  clampFit,
  defaultFit,
  suggestIrisFit,
  resolveGeometry,
  type IrisFit,
  type ResolvedIrisGeometry,
} from "@/lib/iris-fit";
import {
  irisMapUrl,
  lookupRegionInfo,
  normalizeOrganKey,
  parseIrisMap,
  parseManifest,
  parseRegionInfo,
  type IrisEye,
  type IrisManifestEye,
  type IrisMap,
  type RegionInfoEntry,
} from "@/lib/iris-map";
import { exportIrisPng, mountIrisOverlay, type IrisOverlayController } from "@/components/iris/mountIrisOverlay";
import { Button, GhostButton } from "@/components/ui";

type Photo = { url: string; width: number; height: number };
type LoadedMap = {
  eye: IrisEye;
  svg: string;
  map: IrisMap;
  geom: ResolvedIrisGeometry;
  entry: IrisManifestEye;
  manifestVersion?: string;
};

const KIND_LABEL: Record<string, string> = {
  organ: "órgano",
  ring: "anillo",
  band: "banda",
};

function kindLabel(kind: string) {
  return KIND_LABEL[kind] || kind;
}

function grayFromImage(image: CanvasImageSource, width: number, height: number) {
  const maxSide = 360;
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

export function EyeDiagnosis({
  patients,
  initialPatientId = "",
}: {
  patients: { id: string; name: string }[];
  initialPatientId?: string;
}) {
  const [eye, setEye] = useState<IrisEye>("right");
  const [loaded, setLoaded] = useState<LoadedMap | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [info, setInfo] = useState<Record<string, RegionInfoEntry>>({});
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [fit, setFit] = useState<IrisFit | null>(null);
  const [pupilTuned, setPupilTuned] = useState(false);
  const [fitNote, setFitNote] = useState<string | null>(null);
  const [opacity, setOpacity] = useState(0.72);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [labelsVisible, setLabelsVisible] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [patientId, setPatientId] = useState(initialPatientId);
  const [saveState, setSaveState] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [busyExport, setBusyExport] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const hostRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const ctrlRef = useRef<IrisOverlayController | null>(null);
  const fitRef = useRef<IrisFit | null>(null);
  const photoRef = useRef<Photo | null>(null);
  const pupilTunedRef = useRef(false);
  const dragRef = useRef<"move" | "pupil" | "iris" | "rotate" | null>(null);
  const fitTouched = useRef(false);
  const suggestToken = useRef(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  fitRef.current = fit;
  photoRef.current = photo;
  pupilTunedRef.current = pupilTuned;

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
    setMapError(null);
    setSelectedKey(null);
    setHoverKey(null);
    fetch("/iris-maps/manifest.json", { cache: "no-cache" })
      .then(async (res) => {
        if (!res.ok) throw new Error("No se pudo leer el manifiesto de mapas (public/iris-maps/manifest.json).");
        const manifest = parseManifest(await res.json());
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
        return {
          eye,
          svg,
          map,
          geom: resolveGeometry(map.geometry),
          entry,
          manifestVersion: manifest.version,
        } satisfies LoadedMap;
      })
      .then((next) => {
        if (!cancel) setLoaded(next);
      })
      .catch((err: unknown) => {
        if (!cancel) {
          setLoaded(null);
          setMapError(err instanceof Error ? err.message : "No se pudo cargar el mapa.");
        }
      });
    return () => {
      cancel = true;
    };
  }, [eye]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !loaded) return;
    try {
      ctrlRef.current = mountIrisOverlay(host, loaded.svg, loaded.map, loaded.geom);
    } catch (err) {
      setMapError(err instanceof Error ? err.message : "No se pudo mostrar el mapa.");
      ctrlRef.current = null;
    }
    return () => {
      host.replaceChildren();
      ctrlRef.current = null;
    };
  }, [loaded]);

  useEffect(() => {
    if (!loaded) return;
    if (!photo) {
      setFit(defaultFit(loaded.geom.viewBox.width, loaded.geom.viewBox.height, loaded.geom));
      return;
    }
    setFit((prev) => prev ?? defaultFit(photo.width, photo.height, loaded.geom));
    if (fitTouched.current) return;
    void runSuggest(photo.url, photo.width, photo.height);
    // runSuggest is recreated each render and only depends on the latest map via `loaded`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, photo]);

  useEffect(() => {
    const ctrl = ctrlRef.current;
    if (!ctrl || !loaded || !fit) return;
    const width = photo?.width ?? loaded.geom.viewBox.width;
    const height = photo?.height ?? loaded.geom.viewBox.height;
    ctrl.apply(fit, width, height);
    ctrl.setOpacity(opacity);
    ctrl.setVisible(overlayVisible);
    ctrl.setLabels(labelsVisible);
    ctrl.setHighlight(selectedKey, hoverKey);
  }, [loaded, fit, photo, opacity, overlayVisible, labelsVisible, selectedKey, hoverKey]);

  useEffect(() => {
    return () => {
      if (photoRef.current) URL.revokeObjectURL(photoRef.current.url);
    };
  }, []);

  useEffect(() => {
    function onMove(event: PointerEvent) {
      const mode = dragRef.current;
      const current = fitRef.current;
      const currentPhoto = photoRef.current;
      const stage = stageRef.current;
      if (!mode || !current || !currentPhoto || !stage) return;
      const rect = (imgRef.current ?? stage).getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = ((event.clientX - rect.left) / rect.width) * currentPhoto.width;
      const y = ((event.clientY - rect.top) / rect.height) * currentPhoto.height;
      fitTouched.current = true;
      if (mode === "move") {
        setFit(clampFit({ ...current, cx: x, cy: y }, currentPhoto.width, currentPhoto.height));
        return;
      }
      if (mode === "rotate") {
        const rotation = (Math.atan2(x - current.cx, -(y - current.cy)) * 180) / Math.PI;
        setFit(clampFit({ ...current, rotation }, currentPhoto.width, currentPhoto.height));
        return;
      }
      const radius = Math.hypot(x - current.cx, y - current.cy);
      if (mode === "pupil") {
        setPupilTuned(true);
        pupilTunedRef.current = true;
        setFit(clampFit({ ...current, rp: radius }, currentPhoto.width, currentPhoto.height));
        return;
      }
      const rp = pupilTunedRef.current ? current.rp : current.rp * (radius / current.ri);
      setFit(clampFit({ ...current, ri: radius, rp }, currentPhoto.width, currentPhoto.height));
    }
    function onUp() {
      dragRef.current = null;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  function loadPhotoFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoError("Elige una imagen.");
      return;
    }
    setPhotoError(null);
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      fitTouched.current = false;
      setPupilTuned(false);
      pupilTunedRef.current = false;
      setFitNote(null);
      setPhoto((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return { url, width: image.naturalWidth, height: image.naturalHeight };
      });
      if (loaded) {
        setFit(defaultFit(image.naturalWidth, image.naturalHeight, loaded.geom));
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      setPhotoError("No se pudo leer esa imagen.");
    };
    image.src = url;
  }

  async function runSuggest(url: string, width: number, height: number, image?: CanvasImageSource) {
    const token = ++suggestToken.current;
    const source = image ?? (await loadHtmlImage(url));
    if (token !== suggestToken.current || !loaded) return;
    const raster = grayFromImage(source, width, height);
    const guess = raster ? suggestIrisFit(raster.gray, raster.width, raster.height) : null;
    if (token !== suggestToken.current || fitTouched.current) return;
    if (!guess) {
      setFitNote("No se pudo estimar el iris en esta foto. Coloca el centro, la pupila y el borde a mano.");
      return;
    }
    const scale = 1 / (raster?.scale || 1);
    setPupilTuned(true);
    pupilTunedRef.current = true;
    setFit(
      clampFit(
        {
          cx: guess.cx * scale,
          cy: guess.cy * scale,
          rp: guess.rp * scale,
          ri: guess.ri * scale,
          rotation: 0,
        },
        width,
        height,
      ),
    );
    setFitNote(
      "Sugerencia automática de centro y radios. No estima el ojo (derecho o izquierdo) ni la rotación. Muchas fotos necesitan unos −30° y un ajuste manual.",
    );
  }

  const groups = useMemo(() => loaded?.map.groups ?? [], [loaded]);
  const filtered = useMemo(() => {
    const q = normalizeOrganKey(query);
    const raw = query.trim().toLowerCase();
    if (!q && !raw) return groups;
    return groups.filter((group) => {
      const entry = lookupRegionInfo(info, group.organKey);
      const english = entry?.en ? normalizeOrganKey(entry.en) : "";
      return (
        group.organKey.includes(q) ||
        english.includes(q) ||
        (raw && group.number != null && String(group.number).includes(raw)) ||
        group.kinds.some((kind) => kind.includes(raw) || kindLabel(kind).includes(raw))
      );
    });
  }, [groups, info, query]);

  const selected = groups.find((group) => group.organKey === selectedKey) ?? null;
  const selectedInfo = selected ? lookupRegionInfo(info, selected.organKey) : null;

  function updateIris(nextRi: number) {
    if (!fit || !photo) return;
    fitTouched.current = true;
    const rp = pupilTuned ? fit.rp : fit.rp * (nextRi / fit.ri);
    setFit(clampFit({ ...fit, ri: nextRi, rp }, photo.width, photo.height));
  }

  function updatePupil(nextRp: number) {
    if (!fit || !photo) return;
    fitTouched.current = true;
    setPupilTuned(true);
    pupilTunedRef.current = true;
    setFit(clampFit({ ...fit, rp: nextRp }, photo.width, photo.height));
  }

  async function onExport() {
    if (!photo || !loaded || !fit || !ctrlRef.current) return;
    setBusyExport(true);
    setExportError(null);
    try {
      const blob = await exportIrisPng({
        photoUrl: photo.url,
        photoWidth: photo.width,
        photoHeight: photo.height,
        svg: ctrlRef.current.svg,
        geom: loaded.geom,
        fit,
        opacity,
        overlayVisible,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `iris-${eye}-${new Date().toISOString().slice(0, 10)}.png`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "No se pudo exportar el PNG.");
    } finally {
      setBusyExport(false);
    }
  }

  async function onSaveNote() {
    if (!patientId) return;
    setSaveState(null);
    try {
      await saveIrisNoteAction({
        patientId,
        eye,
        organ: selected?.organ,
        kind: selected?.kinds.map(kindLabel).join(", "),
        inferred: selected?.inferred,
        mapLabel: [loaded?.entry.displayName, loaded?.entry.version].filter(Boolean).join(" "),
      });
      setSaveState("Nota guardada en Estudios. La foto no se adjuntó.");
    } catch (err) {
      setSaveState(err instanceof Error ? err.message : "No se pudo guardar la nota.");
    }
  }

  const mapLabel = loaded
    ? `${loaded.entry.displayName}${loaded.entry.version ? ` · ${loaded.entry.version}` : ""}`
    : eye === "right"
      ? "Ojo derecho"
      : "Ojo izquierdo";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-xs uppercase tracking-wide text-[#6D5E52]">Complementaria</p>
      <h1 className="font-serif text-4xl">Diagnóstico del iris</h1>
      <p className="mt-3 max-w-3xl border border-[#EADBCE] bg-white px-4 py-3 text-sm leading-relaxed">
        La iridología es una técnica complementaria y no validada. Lo que muestra este módulo no es un diagnóstico
        médico. La fotografía no sale de este navegador.
      </p>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex border border-[#EADBCE] bg-white" role="group" aria-label="Ojo">
              {(
                [
                  ["right", "Ojo derecho"],
                  ["left", "Ojo izquierdo"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={eye === value}
                  onClick={() => setEye(value)}
                  className={`px-4 py-2 text-sm ${eye === value ? "bg-[#241B16] text-[#FAF7F2]" : "text-[#241B16]"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-sm text-[#6D5E52]">{mapLabel}</p>
          </div>
          <p className="mt-2 text-xs text-[#6D5E52]">
            La lateralidad se elige a mano. No hay detección automática del ojo y no se afirma ninguna certeza.
          </p>

          {mapError ? (
            <div className="mt-4 border border-[#EADBCE] bg-white px-4 py-6 text-sm">
              <p className="text-[#241B16]">No se pudo usar este mapa.</p>
              <p className="mt-2 text-[#6D5E52]">{mapError}</p>
            </div>
          ) : null}

          <div
            ref={stageRef}
            className={`relative mt-4 max-w-full border bg-white ${photo ? "inline-block" : "w-full max-w-[720px]"} ${dragOver ? "border-[#241B16]" : "border-[#EADBCE]"}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragOver(false);
              loadPhotoFile(event.dataTransfer.files?.[0]);
            }}
            onPointerMove={(event) => {
              if (dragRef.current || !overlayVisible) return;
              const key = ctrlRef.current?.pick(event.clientX, event.clientY) ?? null;
              setHoverKey((prev) => (prev === key ? prev : key));
            }}
            onPointerLeave={() => setHoverKey(null)}
            onPointerUp={(event) => {
              if (dragRef.current) return;
              if ((event.target as HTMLElement).closest("[data-handle]")) return;
              if (!overlayVisible) return;
              const key = ctrlRef.current?.pick(event.clientX, event.clientY) ?? null;
              setSelectedKey((prev) => (key == null || prev === key ? null : key));
            }}
          >
            {photo ? (
              // Local blob preview. next/image does not apply.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                ref={imgRef}
                src={photo.url}
                alt="Fotografía del ojo, solo en este navegador"
                className="block max-h-[72vh] max-w-full"
                draggable={false}
              />
            ) : (
              <div className="aspect-square w-full max-w-[720px] bg-[#F6F1EA]">
                <p className="pointer-events-none p-3 text-xs text-[#6D5E52]">
                  Mapa sin foto. Arrastra una imagen aquí para alinearlo.
                </p>
              </div>
            )}
            <div ref={hostRef} className="pointer-events-none absolute inset-0" />
            {photo && fit && overlayVisible ? (
              <>
                <div
                  className="pointer-events-none absolute rounded-full border border-dashed border-[#241B16]/40"
                  style={{
                    left: `${((fit.cx - fit.ri) / photo.width) * 100}%`,
                    top: `${((fit.cy - fit.ri) / photo.height) * 100}%`,
                    width: `${((fit.ri * 2) / photo.width) * 100}%`,
                    height: `${((fit.ri * 2) / photo.height) * 100}%`,
                  }}
                />
                <div
                  className="pointer-events-none absolute rounded-full border border-dashed border-[#8C3A2A]/70"
                  style={{
                    left: `${((fit.cx - fit.rp) / photo.width) * 100}%`,
                    top: `${((fit.cy - fit.rp) / photo.height) * 100}%`,
                    width: `${((fit.rp * 2) / photo.width) * 100}%`,
                    height: `${((fit.rp * 2) / photo.height) * 100}%`,
                  }}
                />
                <div
                  className="pointer-events-none absolute h-px bg-[#241B16]/40"
                  style={{
                    left: `${(fit.cx / photo.width) * 100}%`,
                    top: `${(fit.cy / photo.height) * 100}%`,
                    width: `${(fit.ri / photo.width) * 100}%`,
                    transform: `rotate(${fit.rotation - 90}deg)`,
                    transformOrigin: "0 50%",
                  }}
                />
                <FitHandle mode="move" label="Mover centro" x={fit.cx} y={fit.cy} photo={photo} dragRef={dragRef} />
                <FitHandle
                  mode="pupil"
                  label="Radio de la pupila"
                  x={fit.cx}
                  y={fit.cy + fit.rp}
                  photo={photo}
                  dragRef={dragRef}
                />
                <FitHandle
                  mode="iris"
                  label="Borde del iris"
                  x={fit.cx + fit.ri}
                  y={fit.cy}
                  photo={photo}
                  dragRef={dragRef}
                />
                <FitHandle
                  mode="rotate"
                  label="Rotación, las 12 en punto"
                  x={fit.cx + (fit.ri + Math.max(14, fit.ri * 0.06)) * Math.sin((fit.rotation * Math.PI) / 180)}
                  y={fit.cy - (fit.ri + Math.max(14, fit.ri * 0.06)) * Math.cos((fit.rotation * Math.PI) / 180)}
                  photo={photo}
                  dragRef={dragRef}
                />
              </>
            ) : null}
          </div>

          {photoError ? <p className="mt-2 text-sm text-[#6D5E52]">{photoError}</p> : null}
          {fitNote ? <p className="mt-3 text-sm text-[#6D5E52]">{fitNote}</p> : null}
          {loaded?.geom.usedFallback ? (
            <p className="mt-2 text-sm text-[#6D5E52]">
              Este SVG no declara bien pupila o radio exterior. El ajuste usa el viewBox como aproximación.
            </p>
          ) : null}
          {loaded?.map.warnings.length ? (
            <ul className="mt-2 list-disc pl-5 text-xs text-[#6D5E52]">
              {loaded.map.warnings.slice(0, 4).map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" onClick={() => fileRef.current?.click()}>
              {photo ? "Cambiar foto" : "Elegir foto"}
            </Button>
            <GhostButton type="button" onClick={() => cameraRef.current?.click()}>
              Cámara
            </GhostButton>
            <GhostButton
              type="button"
              onClick={() => setOverlayVisible((value) => !value)}
              disabled={!loaded}
            >
              {overlayVisible ? "Ocultar mapa" : "Mostrar mapa"}
            </GhostButton>
            <GhostButton type="button" onClick={() => setLabelsVisible((value) => !value)} disabled={!loaded}>
              {labelsVisible ? "Ocultar etiquetas del mapa" : "Etiquetas del mapa"}
            </GhostButton>
            <GhostButton
              type="button"
              disabled={!photo || !loaded}
              onClick={() => {
                if (!photo || !loaded) return;
                fitTouched.current = false;
                setPupilTuned(false);
                pupilTunedRef.current = false;
                setFit(defaultFit(photo.width, photo.height, loaded.geom));
                void runSuggest(photo.url, photo.width, photo.height);
              }}
            >
              Sugerir ajuste
            </GhostButton>
            <GhostButton type="button" disabled={!photo || !fit} onClick={() => void onExport()}>
              {busyExport ? "Exportando…" : "Descargar PNG"}
            </GhostButton>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              loadPhotoFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => {
              loadPhotoFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          {exportError ? <p className="mt-2 text-sm text-red-800">{exportError}</p> : null}

          {photo && fit ? (
            <div className="mt-4 grid gap-3 border border-[#EADBCE] bg-white p-4 text-sm sm:grid-cols-2">
              <label>
                Opacidad del mapa
                <input
                  className="mt-1 block w-full"
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(opacity * 100)}
                  onChange={(event) => setOpacity(Number(event.target.value) / 100)}
                />
              </label>
              <label>
                Rotación ({Math.round(fit.rotation)}°)
                <input
                  className="mt-1 block w-full"
                  type="range"
                  min={-180}
                  max={180}
                  value={Math.round(fit.rotation)}
                  onChange={(event) => {
                    fitTouched.current = true;
                    setFit(clampFit({ ...fit, rotation: Number(event.target.value) }, photo.width, photo.height));
                  }}
                />
              </label>
              <label>
                Radio del iris ({Math.round(fit.ri)} px)
                <input
                  className="mt-1 block w-full"
                  type="range"
                  min={20}
                  max={Math.round(Math.max(photo.width, photo.height))}
                  value={Math.round(fit.ri)}
                  onChange={(event) => updateIris(Number(event.target.value))}
                />
              </label>
              <label>
                Radio de la pupila ({Math.round(fit.rp)} px)
                <input
                  className="mt-1 block w-full"
                  type="range"
                  min={4}
                  max={Math.round(Math.max(8, fit.ri - 6))}
                  value={Math.round(fit.rp)}
                  onChange={(event) => updatePupil(Number(event.target.value))}
                />
              </label>
              <p className="sm:col-span-2 text-xs text-[#6D5E52]">
                Arrastra el centro, el asa inferior de la pupila, el asa derecha del iris y el asa de las 12. Si mueves
                la pupila, el mapa se estira en radio para que el borde pupilar y el borde del iris caigan en la foto.
                Mientras no la muevas, el iris crece de forma uniforme.
              </p>
            </div>
          ) : null}

          {patients.length || patientId ? (
            <div className="mt-4 border border-[#EADBCE] bg-white p-4 text-sm">
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
            <p className="mt-4 text-sm text-[#6D5E52]">
              No hay pacientes cargados. Puedes alinear y exportar igual; la foto sigue en este navegador.
            </p>
          )}
        </section>

        <aside className="border border-[#EADBCE] bg-white lg:sticky lg:top-4">
          <div className="border-b border-[#EADBCE] px-4 py-3">
            <h2 className="font-serif text-2xl">Regiones</h2>
            <p className="mt-1 text-xs text-[#6D5E52]">
              {loaded ? `${groups.length} áreas en el mapa` : "Cargando mapa…"}
            </p>
          </div>
          <div className="px-4 py-3" aria-live="polite">
            {selected ? (
              <div>
                <p className="text-xs uppercase tracking-wide text-[#6D5E52]">
                  {selected.kinds.map(kindLabel).join(" · ")}
                  {selected.number != null ? ` · #${selected.number}` : ""}
                  {selected.ids.length > 1 ? ` · ${selected.ids.length} partes` : ""}
                </p>
                <p className="mt-1 font-serif text-2xl">{selected.organ}</p>
                {selectedInfo?.en ? <p className="text-sm text-[#6D5E52]">{selectedInfo.en}</p> : null}
                {selected.inferred ? (
                  <p className="mt-2 text-sm">Ubicación inferida en el mapa, no leída directamente del gráfico.</p>
                ) : null}
                {selectedInfo?.note ? <p className="mt-2 text-sm text-[#6D5E52]">{selectedInfo.note}</p> : null}
                <button
                  type="button"
                  className="mt-3 text-xs text-[#6D5E52] underline"
                  onClick={() => setSelectedKey(null)}
                >
                  Quitar selección
                </button>
              </div>
            ) : (
              <p className="text-sm text-[#6D5E52]">
                Pulsa una zona del mapa o una fila de la lista. Volver a pulsar la quita.
              </p>
            )}
          </div>
          <div className="px-4 pb-3">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar órgano o área"
              className="w-full border border-[#EADBCE] px-3 py-2 text-sm"
              aria-label="Buscar región"
            />
          </div>
          <ul className="max-h-[32rem] overflow-auto border-t border-[#EADBCE] text-sm">
            {filtered.length === 0 ? (
              <li className="px-4 py-6 text-[#6D5E52]">Ninguna región coincide.</li>
            ) : (
              filtered.map((group) => {
                const active = group.organKey === selectedKey;
                const entry = lookupRegionInfo(info, group.organKey);
                return (
                  <li key={group.organKey}>
                    <button
                      type="button"
                      className={`block w-full px-4 py-2 text-left ${active ? "bg-[#241B16] text-[#FAF7F2]" : "hover:bg-[#FAF7F2]"}`}
                      onClick={() => setSelectedKey((prev) => (prev === group.organKey ? null : group.organKey))}
                      onMouseEnter={() => setHoverKey(group.organKey)}
                      onMouseLeave={() => setHoverKey((prev) => (prev === group.organKey ? null : prev))}
                    >
                      <span className="block">
                        {group.number != null ? <span className="mr-2 text-xs opacity-70">{group.number}</span> : null}
                        {group.organ}
                      </span>
                      <span className={`mt-0.5 block text-xs ${active ? "text-[#EADBCE]" : "text-[#6D5E52]"}`}>
                        {group.kinds.map(kindLabel).join(" · ")}
                        {group.inferred ? " · inferida" : ""}
                        {entry?.en ? ` · ${entry.en}` : ""}
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
  );
}

function loadHtmlImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No se pudo leer la foto."));
    image.src = url;
  });
}

function FitHandle({
  mode,
  label,
  x,
  y,
  photo,
  dragRef,
}: {
  mode: "move" | "pupil" | "iris" | "rotate";
  label: string;
  x: number;
  y: number;
  photo: Photo;
  dragRef: MutableRefObject<"move" | "pupil" | "iris" | "rotate" | null>;
}) {
  const tone =
    mode === "pupil"
      ? "bg-[#8C3A2A]"
      : mode === "rotate"
        ? "bg-[#C4A574]"
        : mode === "move"
          ? "bg-white"
          : "bg-[#241B16]";
  return (
    <button
      type="button"
      data-handle={mode}
      title={label}
      aria-label={label}
      className={`absolute z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow ${mode === "move" ? "border-[#241B16] bg-white" : `border-white ${tone}`}`}
      style={{ left: `${(x / photo.width) * 100}%`, top: `${(y / photo.height) * 100}%`, touchAction: "none" }}
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        dragRef.current = mode;
      }}
    />
  );
}
