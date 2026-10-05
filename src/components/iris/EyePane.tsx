"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import {
  clampFit,
  defaultFit,
  suggestIrisFit,
  type IrisFit,
  type ResolvedIrisGeometry,
} from "@/lib/iris-fit";
import type { IrisEye, IrisManifestEye, IrisMap } from "@/lib/iris-map";
import type { IrisOverlayController } from "@/components/iris/mountIrisOverlay";
import { mountIrisOverlay } from "@/components/iris/mountIrisOverlay";
import { Button, GhostButton } from "@/components/ui";

export type Photo = { url: string; width: number; height: number };

export type LoadedMap = {
  eye: IrisEye;
  svg: string;
  map: IrisMap;
  geom: ResolvedIrisGeometry;
  entry: IrisManifestEye;
  manifestVersion?: string;
};

export type SlotState = {
  photo: Photo | null;
  fit: IrisFit | null;
  pupilTuned: boolean;
  opacity: number;
  overlayVisible: boolean;
  labelsVisible: boolean;
  pupilBlack: boolean;
  fitNote: string | null;
  photoError: string | null;
  autoSuggest: boolean;
};

export function emptySlot(): SlotState {
  return {
    photo: null,
    fit: null,
    pupilTuned: false,
    opacity: 0.72,
    overlayVisible: true,
    labelsVisible: false,
    pupilBlack: true,
    fitNote: null,
    photoError: null,
    autoSuggest: false,
  };
}

type DragMode = "move" | "pupil" | "iris" | "rotate";

export function EyePane({
  eye,
  label,
  loaded,
  mapError,
  loading,
  slot,
  onSlot,
  highlightKey,
  hoverKey,
  onHover,
  onPick,
  otherHasPhoto,
  onSwap,
  onExport,
  busyExport,
  onController,
}: {
  eye: IrisEye;
  label: string;
  loaded: LoadedMap | null;
  mapError: string | null;
  loading: boolean;
  slot: SlotState;
  onSlot: (patch: Partial<SlotState> & { forPhoto?: string }) => void;
  highlightKey: string | null;
  hoverKey: string | null;
  onHover: (key: string | null) => void;
  onPick: (key: string | null) => void;
  otherHasPhoto: boolean;
  onSwap: () => void;
  onExport: () => void;
  busyExport: boolean;
  onController: (controller: IrisOverlayController | null) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const ctrlRef = useRef<IrisOverlayController | null>(null);
  const fitRef = useRef<IrisFit | null>(slot.fit);
  const photoRef = useRef<Photo | null>(slot.photo);
  const pupilTunedRef = useRef(slot.pupilTuned);
  const dragRef = useRef<DragMode | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const suggestToken = useRef(0);
  const photoToken = useRef(0);
  const [suggestRun, setSuggestRun] = useState(0);
  const onSlotRef = useRef(onSlot);
  const onControllerRef = useRef(onController);
  const [dragOver, setDragOver] = useState(false);

  fitRef.current = slot.fit;
  photoRef.current = slot.photo;
  pupilTunedRef.current = slot.pupilTuned;
  onSlotRef.current = onSlot;
  onControllerRef.current = onController;

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !loaded) {
      ctrlRef.current = null;
      onControllerRef.current(null);
      return;
    }
    try {
      const ctrl = mountIrisOverlay(host, loaded.svg, loaded.map, loaded.geom);
      ctrlRef.current = ctrl;
      onControllerRef.current(ctrl);
    } catch (err) {
      ctrlRef.current = null;
      onControllerRef.current(null);
      onSlotRef.current({
        photoError: err instanceof Error ? err.message : "No se pudo mostrar el mapa.",
      });
    }
    return () => {
      host.replaceChildren();
      ctrlRef.current = null;
      onControllerRef.current(null);
    };
  }, [loaded]);

  useEffect(() => {
    if (!loaded || slot.fit) return;
    const width = slot.photo?.width ?? loaded.geom.viewBox.width;
    const height = slot.photo?.height ?? loaded.geom.viewBox.height;
    onSlotRef.current({ fit: defaultFit(width, height, loaded.geom) });
  }, [loaded, slot.fit, slot.photo]);

  useEffect(() => {
    const ctrl = ctrlRef.current;
    if (!ctrl || !loaded || !slot.fit) return;
    const width = slot.photo?.width ?? loaded.geom.viewBox.width;
    const height = slot.photo?.height ?? loaded.geom.viewBox.height;
    ctrl.apply(slot.fit, width, height);
    ctrl.setOpacity(slot.opacity);
    ctrl.setVisible(slot.overlayVisible);
    ctrl.setLabels(slot.labelsVisible);
    ctrl.setPupilBlack(slot.pupilBlack);
    ctrl.setHighlight(highlightKey, hoverKey);
  }, [loaded, slot, highlightKey, hoverKey]);

  useEffect(() => {
    if (!slot.autoSuggest || !slot.photo || !loaded) return;
    const photo = slot.photo;
    const token = ++suggestToken.current;
    let cancel = false;
    void (async () => {
      try {
        const image = await loadHtmlImage(photo.url);
        if (cancel || token !== suggestToken.current) return;
        const raster = grayFromImage(image, photo.width, photo.height);
        const guess = raster ? suggestIrisFit(raster.gray, raster.width, raster.height) : null;
        if (cancel || token !== suggestToken.current) return;
        if (!guess) {
          onSlotRef.current({
            forPhoto: photo.url,
            autoSuggest: false,
            fitNote: "No se pudo estimar el iris en esta foto. Coloca el centro, la pupila y el borde a mano.",
          });
          return;
        }
        const scale = 1 / (raster?.scale || 1);
        onSlotRef.current({
          forPhoto: photo.url,
          autoSuggest: false,
          pupilTuned: true,
          fit: clampFit(
            {
              cx: guess.cx * scale,
              cy: guess.cy * scale,
              rp: guess.rp * scale,
              ri: guess.ri * scale,
              rotation: 0,
            },
            photo.width,
            photo.height,
          ),
          fitNote:
            "Sugerencia automática de centro y radios. No estima la rotación. Muchas fotos necesitan unos −30° y un ajuste manual.",
        });
      } catch {
        if (!cancel && token === suggestToken.current) {
          onSlotRef.current({
            forPhoto: photo.url,
            autoSuggest: false,
            fitNote: "No se pudo leer la foto para sugerir el ajuste.",
          });
        }
      }
    })();
    return () => {
      cancel = true;
    };
  }, [slot.autoSuggest, slot.photo, loaded, suggestRun]);

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
      suggestToken.current += 1;
      if (mode === "move") {
        onSlotRef.current({
          autoSuggest: false,
          fit: clampFit({ ...current, cx: x, cy: y }, currentPhoto.width, currentPhoto.height),
        });
        return;
      }
      if (mode === "rotate") {
        const rotation = (Math.atan2(x - current.cx, -(y - current.cy)) * 180) / Math.PI;
        onSlotRef.current({
          autoSuggest: false,
          fit: clampFit({ ...current, rotation }, currentPhoto.width, currentPhoto.height),
        });
        return;
      }
      const radius = Math.hypot(x - current.cx, y - current.cy);
      if (mode === "pupil") {
        pupilTunedRef.current = true;
        onSlotRef.current({
          autoSuggest: false,
          pupilTuned: true,
          fit: clampFit({ ...current, rp: radius }, currentPhoto.width, currentPhoto.height),
        });
        return;
      }
      const rp = pupilTunedRef.current ? current.rp : current.rp * (radius / current.ri);
      onSlotRef.current({
        autoSuggest: false,
        fit: clampFit({ ...current, ri: radius, rp }, currentPhoto.width, currentPhoto.height),
      });
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
      onSlot({ photoError: "Elige una imagen.", autoSuggest: false });
      return;
    }
    const token = ++photoToken.current;
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      if (token !== photoToken.current) {
        URL.revokeObjectURL(url);
        return;
      }
      const photo = { url, width: image.naturalWidth, height: image.naturalHeight };
      onSlot({
        photo,
        photoError: null,
        pupilTuned: false,
        autoSuggest: true,
        fitNote: null,
        fit: loaded ? defaultFit(photo.width, photo.height, loaded.geom) : null,
      });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      if (token !== photoToken.current) return;
      onSlot({ photoError: "No se pudo leer esa imagen.", autoSuggest: false });
    };
    image.src = url;
  }

  function updateIris(nextRi: number) {
    if (!slot.fit || !slot.photo) return;
    suggestToken.current += 1;
    const rp = slot.pupilTuned ? slot.fit.rp : slot.fit.rp * (nextRi / slot.fit.ri);
    onSlot({
      autoSuggest: false,
      fit: clampFit({ ...slot.fit, ri: nextRi, rp }, slot.photo.width, slot.photo.height),
    });
  }

  function updatePupil(nextRp: number) {
    if (!slot.fit || !slot.photo) return;
    suggestToken.current += 1;
    onSlot({
      autoSuggest: false,
      pupilTuned: true,
      fit: clampFit({ ...slot.fit, rp: nextRp }, slot.photo.width, slot.photo.height),
    });
  }

  const mapLabel = loaded
    ? `${loaded.entry.displayName}${loaded.entry.version ? ` · ${loaded.entry.version}` : ""}`
    : loading
      ? "Cargando mapa…"
      : "Sin mapa";
  const otherLabel = eye === "right" ? "ojo izquierdo" : "ojo derecho";

  return (
    <section data-eye={eye} aria-label={label} className="min-w-0">
      <h2 className="font-serif text-2xl">{label}</h2>
      <p className="mt-1 text-sm text-[#6D5E52]">{mapLabel}</p>

      {mapError ? (
        <div className="mt-4 border border-[#EADBCE] bg-white px-4 py-6 text-sm">
          <p className="text-[#241B16]">No se pudo usar este mapa.</p>
          <p className="mt-2 text-[#6D5E52]">{mapError}</p>
        </div>
      ) : null}

      <div
        ref={stageRef}
        className={`relative mt-4 max-w-full border bg-white ${slot.photo ? "inline-block" : "w-full"} ${dragOver ? "border-[#241B16]" : "border-[#EADBCE]"}`}
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
          if (dragRef.current || !slot.overlayVisible) return;
          const key = ctrlRef.current?.pick(event.clientX, event.clientY) ?? null;
          onHover(key);
        }}
        onPointerLeave={() => onHover(null)}
        onPointerUp={(event) => {
          if (dragRef.current) return;
          if ((event.target as HTMLElement).closest("[data-handle]")) return;
          if (!slot.overlayVisible) return;
          const key = ctrlRef.current?.pick(event.clientX, event.clientY) ?? null;
          onPick(key);
        }}
      >
        {slot.photo ? (
          // Local blob preview. next/image does not apply.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={imgRef}
            src={slot.photo.url}
            alt={`Fotografía del ${label.toLowerCase()}, solo en este navegador`}
            className="block max-h-[58vh] max-w-full"
            draggable={false}
          />
        ) : (
          <div className="aspect-square w-full bg-[#F6F1EA]">
            <p className="pointer-events-none p-3 text-xs text-[#6D5E52]">
              Mapa sin foto. Arrastra una imagen aquí para alinearlo.
            </p>
          </div>
        )}
        <div ref={hostRef} className="pointer-events-none absolute inset-0" />
        {slot.photo && slot.fit && slot.overlayVisible ? (
          <>
            <div
              className="pointer-events-none absolute rounded-full border border-dashed border-[#241B16]/40"
              style={circleStyle(slot.fit.cx, slot.fit.cy, slot.fit.ri, slot.photo)}
            />
            <div
              className="pointer-events-none absolute rounded-full border border-dashed border-[#8C3A2A]/70"
              style={circleStyle(slot.fit.cx, slot.fit.cy, slot.fit.rp, slot.photo)}
            />
            <div
              className="pointer-events-none absolute h-px bg-[#241B16]/40"
              style={{
                left: `${(slot.fit.cx / slot.photo.width) * 100}%`,
                top: `${(slot.fit.cy / slot.photo.height) * 100}%`,
                width: `${(slot.fit.ri / slot.photo.width) * 100}%`,
                transform: `rotate(${slot.fit.rotation - 90}deg)`,
                transformOrigin: "0 50%",
              }}
            />
            <FitHandle mode="move" label="Mover centro" x={slot.fit.cx} y={slot.fit.cy} photo={slot.photo} dragRef={dragRef} />
            <FitHandle
              mode="pupil"
              label="Radio de la pupila"
              x={slot.fit.cx}
              y={slot.fit.cy + slot.fit.rp}
              photo={slot.photo}
              dragRef={dragRef}
            />
            <FitHandle
              mode="iris"
              label="Borde del iris"
              x={slot.fit.cx + slot.fit.ri}
              y={slot.fit.cy}
              photo={slot.photo}
              dragRef={dragRef}
            />
            <FitHandle
              mode="rotate"
              label="Rotación, las 12 en punto"
              x={slot.fit.cx + (slot.fit.ri + Math.max(14, slot.fit.ri * 0.06)) * Math.sin((slot.fit.rotation * Math.PI) / 180)}
              y={slot.fit.cy - (slot.fit.ri + Math.max(14, slot.fit.ri * 0.06)) * Math.cos((slot.fit.rotation * Math.PI) / 180)}
              photo={slot.photo}
              dragRef={dragRef}
            />
          </>
        ) : null}
      </div>

      {slot.photoError ? <p className="mt-2 text-sm text-[#6D5E52]">{slot.photoError}</p> : null}
      {slot.fitNote ? <p className="mt-3 text-sm text-[#6D5E52]">{slot.fitNote}</p> : null}
      {loaded?.geom.usedFallback ? (
        <p className="mt-2 text-sm text-[#6D5E52]">
          Este SVG no declara bien pupila o radio exterior. El ajuste usa el viewBox como aproximación.
        </p>
      ) : null}
      {loaded?.map.warnings.length ? (
        <ul className="mt-2 list-disc pl-5 text-xs text-[#6D5E52]">
          {loaded.map.warnings.slice(0, 3).map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" onClick={() => fileRef.current?.click()}>
          {slot.photo ? "Cambiar foto" : "Elegir foto"}
        </Button>
        <GhostButton type="button" onClick={() => cameraRef.current?.click()}>
          Cámara
        </GhostButton>
        <GhostButton type="button" onClick={() => onSlot({ overlayVisible: !slot.overlayVisible })} disabled={!loaded}>
          {slot.overlayVisible ? "Ocultar mapa" : "Mostrar mapa"}
        </GhostButton>
        <GhostButton type="button" onClick={() => onSlot({ labelsVisible: !slot.labelsVisible })} disabled={!loaded}>
          {slot.labelsVisible ? "Ocultar etiquetas" : "Etiquetas del mapa"}
        </GhostButton>
        <GhostButton
          type="button"
          disabled={!slot.photo || !loaded}
          onClick={() => {
            if (!slot.photo || !loaded) return;
            suggestToken.current += 1;
            setSuggestRun((run) => run + 1);
            onSlot({
              pupilTuned: false,
              autoSuggest: true,
              fitNote: null,
              fit: defaultFit(slot.photo.width, slot.photo.height, loaded.geom),
            });
          }}
        >
          Sugerir ajuste
        </GhostButton>
        <GhostButton type="button" disabled={!slot.photo || !slot.fit || busyExport} onClick={onExport}>
          {busyExport ? "Exportando…" : "Descargar PNG"}
        </GhostButton>
        {slot.photo ? (
          <GhostButton type="button" onClick={onSwap}>
            {otherHasPhoto ? "Intercambiar fotos" : `Mover al ${otherLabel}`}
          </GhostButton>
        ) : null}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-label={`Foto para ${label}`}
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
        aria-label={`Cámara para ${label}`}
        onChange={(event) => {
          loadPhotoFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      <label className="mt-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={slot.pupilBlack}
          onChange={(event) => onSlot({ pupilBlack: event.target.checked })}
        />
        Pupila negra
      </label>

      {slot.photo && slot.fit ? (
        <div className="mt-4 grid gap-3 border border-[#EADBCE] bg-white p-4 text-sm">
          <label>
            Opacidad del mapa
            <input
              className="mt-1 block w-full"
              type="range"
              min={0}
              max={100}
              value={Math.round(slot.opacity * 100)}
              onChange={(event) => onSlot({ opacity: Number(event.target.value) / 100 })}
            />
          </label>
          <label>
            Rotación ({Math.round(slot.fit.rotation)}°)
            <input
              className="mt-1 block w-full"
              type="range"
              min={-180}
              max={180}
              value={Math.round(slot.fit.rotation)}
              onChange={(event) => {
                suggestToken.current += 1;
                onSlot({
                  autoSuggest: false,
                  fit: clampFit(
                    { ...slot.fit!, rotation: Number(event.target.value) },
                    slot.photo!.width,
                    slot.photo!.height,
                  ),
                });
              }}
            />
          </label>
          <label>
            Radio del iris ({Math.round(slot.fit.ri)} px)
            <input
              className="mt-1 block w-full"
              type="range"
              min={20}
              max={Math.round(Math.max(slot.photo.width, slot.photo.height))}
              value={Math.round(slot.fit.ri)}
              onChange={(event) => updateIris(Number(event.target.value))}
            />
          </label>
          <label>
            Radio de la pupila ({Math.round(slot.fit.rp)} px)
            <input
              className="mt-1 block w-full"
              type="range"
              min={4}
              max={Math.round(Math.max(8, slot.fit.ri - 6))}
              value={Math.round(slot.fit.rp)}
              onChange={(event) => updatePupil(Number(event.target.value))}
            />
          </label>
          <p className="text-xs text-[#6D5E52]">
            Arrastra el centro, el asa inferior de la pupila, el asa derecha del iris y el asa de las 12. Si mueves la
            pupila, el mapa —incluida la pupila negra— se estira en radio. Mientras no la muevas, el iris crece de forma
            uniforme.
          </p>
        </div>
      ) : null}
    </section>
  );
}

function circleStyle(cx: number, cy: number, radius: number, photo: Photo) {
  return {
    left: `${((cx - radius) / photo.width) * 100}%`,
    top: `${((cy - radius) / photo.height) * 100}%`,
    width: `${((radius * 2) / photo.width) * 100}%`,
    height: `${((radius * 2) / photo.height) * 100}%`,
  };
}

function loadHtmlImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No se pudo leer la foto."));
    image.src = url;
  });
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

function FitHandle({
  mode,
  label,
  x,
  y,
  photo,
  dragRef,
}: {
  mode: DragMode;
  label: string;
  x: number;
  y: number;
  photo: Photo;
  dragRef: MutableRefObject<DragMode | null>;
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
