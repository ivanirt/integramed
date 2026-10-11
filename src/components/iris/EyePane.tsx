"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import {
  clampFit,
  defaultFit,
  suggestIrisFit,
  type IrisFit,
  type ResolvedIrisGeometry,
} from "@/lib/iris-fit";
import { clampIrisMask, defaultIrisMask, maskLimit, type IrisMask } from "@/lib/iris-mask";
import type { IrisEye, IrisManifestEye, IrisMap } from "@/lib/iris-map";
import type { IrisOverlayController } from "@/components/iris/mountIrisOverlay";
import { mountIrisOverlay } from "@/components/iris/mountIrisOverlay";
import { loadHtmlImage, paintIrisClean } from "@/components/iris/paintIrisClean";
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

export type IrisView = "original" | "clean";

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
  /** Derived window. The photo blob itself is never replaced. */
  view: IrisView;
  mask: IrisMask | null;
  /** When true, mask.radius tracks the iris handle. */
  maskLinked: boolean;
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
    view: "original",
    mask: null,
    maskLinked: true,
  };
}

export function slotView(slot: Pick<SlotState, "view" | "mask" | "photo" | "fit">): IrisView {
  return slot.view === "clean" && slot.mask && slot.photo && slot.fit ? "clean" : "original";
}

type DragMode = "move" | "pupil" | "iris" | "rotate" | "mask" | "lidTop" | "lidBottom";

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
  expanded = false,
  concealed = false,
  onMaximize,
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
  onExport: (which: "active" | "other") => void;
  busyExport: boolean;
  onController: (controller: IrisOverlayController | null) => void;
  /** This slot is inside the enlarged view, alone or beside the other eye. */
  expanded?: boolean;
  /** The other slot is the one filling the screen. */
  concealed?: boolean;
  onMaximize?: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const measureRef = useRef<HTMLElement | null>(null);
  const ctrlRef = useRef<IrisOverlayController | null>(null);
  const fitRef = useRef<IrisFit | null>(slot.fit);
  const photoRef = useRef<Photo | null>(slot.photo);
  const maskRef = useRef<IrisMask | null>(slot.mask);
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
  const frameRef = useRef<HTMLDivElement>(null);
  const [frameBox, setFrameBox] = useState({ width: 0, height: 0 });

  fitRef.current = slot.fit;
  photoRef.current = slot.photo;
  maskRef.current = slot.mask;
  pupilTunedRef.current = slot.pupilTuned;
  measureRef.current = slotView(slot) === "clean" ? canvasRef.current : imgRef.current;
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
    if (!slot.mask || !slot.maskLinked || !slot.fit || !slot.photo) return;
    const next = clampIrisMask(
      { ...slot.mask, radius: slot.fit.ri },
      maskLimit(slot.photo.width, slot.photo.height),
    );
    if (
      Math.abs(next.radius - slot.mask.radius) < 0.5 &&
      Math.abs(next.feather - slot.mask.feather) < 0.5 &&
      Math.abs(next.lidTop - slot.mask.lidTop) < 0.5 &&
      Math.abs(next.lidBottom - slot.mask.lidBottom) < 0.5
    ) {
      return;
    }
    onSlotRef.current({ mask: next });
  }, [slot.mask, slot.maskLinked, slot.fit, slot.photo]);

  useEffect(() => {
    if (slotView(slot) !== "clean" || !slot.photo || !slot.fit || !slot.mask) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const photo = slot.photo;
    const fit = slot.fit;
    const mask = slot.maskLinked ? { ...slot.mask, radius: fit.ri } : slot.mask;
    let cancel = false;
    const long = Math.max(photo.width, photo.height);
    const scale = Math.min(1, PREVIEW_LONG_SIDE / long);
    const width = Math.max(2, Math.round(photo.width * scale));
    const height = Math.max(2, Math.round(photo.height * scale));
    void loadHtmlImage(photo.url)
      .then((image) => {
        if (cancel) return;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        if (canvas.width !== width) canvas.width = width;
        if (canvas.height !== height) canvas.height = height;
        paintIrisClean(ctx, image, photo.width, photo.height, fit.cx, fit.cy, mask, () => cancel);
      })
      .catch(() => {
        /* The original photo stays on screen if the derived view cannot be painted. */
      });
    return () => {
      cancel = true;
    };
  }, [slot]);

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
    if (!expanded) return;
    const node = frameRef.current;
    if (!node) return;
    const measure = () => {
      const rect = node.getBoundingClientRect();
      setFrameBox({ width: rect.width, height: rect.height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [expanded]);

  useEffect(() => {
    function onMove(event: PointerEvent) {
      const mode = dragRef.current;
      const current = fitRef.current;
      const currentPhoto = photoRef.current;
      const stage = stageRef.current;
      if (!mode || !current || !currentPhoto || !stage) return;
      const rect = (measureRef.current ?? stage).getBoundingClientRect();
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
      if (mode === "mask" || mode === "lidTop" || mode === "lidBottom") {
        const mask = maskRef.current;
        if (!mask) return;
        const limit = maskLimit(currentPhoto.width, currentPhoto.height);
        if (mode === "mask") {
          onSlotRef.current({
            maskLinked: false,
            mask: clampIrisMask({ ...mask, radius }, limit),
          });
          return;
        }
        const along = mode === "lidTop" ? y - (current.cy - mask.radius) : current.cy + mask.radius - y;
        onSlotRef.current({
          mask: clampIrisMask(mode === "lidTop" ? { ...mask, lidTop: along } : { ...mask, lidBottom: along }, limit),
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
        view: "original",
        mask: null,
        maskLinked: true,
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

  const photoLimit =
    expanded && frameBox.height > 80
      ? Math.max(80, Math.floor(Math.min(frameBox.height, Math.max(frameBox.width, 1)) - 4))
      : undefined;
  const showingClean = slotView(slot) === "clean";
  const photoStyle =
    expanded && frameBox.width > 80 && frameBox.height > 80
      ? {
          maxWidth: Math.max(80, Math.floor(frameBox.width) - 4),
          maxHeight: Math.max(80, Math.floor(frameBox.height) - 4),
        }
      : { maxHeight: "58vh" };

  function cleanThisImage() {
    if (!slot.photo || !slot.fit) return;
    const limit = maskLimit(slot.photo.width, slot.photo.height);
    const base = slot.mask ?? defaultIrisMask(slot.fit.ri);
    const linked = slot.mask ? slot.maskLinked : true;
    onSlot({
      view: "clean",
      maskLinked: linked,
      mask: clampIrisMask({ ...base, radius: linked ? slot.fit.ri : base.radius }, limit),
    });
  }

  function setMask(next: IrisMask, linked = slot.maskLinked) {
    if (!slot.photo) return;
    onSlot({
      maskLinked: linked,
      mask: clampIrisMask(next, maskLimit(slot.photo.width, slot.photo.height)),
    });
  }

  return (
    <section
      data-eye={eye}
      aria-label={label}
      className={`min-w-0 ${concealed ? "hidden" : ""} ${expanded ? "flex h-full min-h-0 flex-col" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-serif text-2xl">{label}</h2>
          <p className="mt-1 text-sm text-[#6D5E52]">{mapLabel}</p>
        </div>
        {onMaximize && !expanded ? (
          <GhostButton type="button" onClick={onMaximize} aria-label={`Ampliar ${label}`}>
            Ampliar
          </GhostButton>
        ) : null}
      </div>

      {mapError ? (
        <div className="mt-4 border border-[#EADBCE] bg-white px-4 py-6 text-sm">
          <p className="text-[#241B16]">No se pudo usar este mapa.</p>
          <p className="mt-2 text-[#6D5E52]">{mapError}</p>
        </div>
      ) : null}

      <div
        ref={frameRef}
        className={expanded ? "mt-3 flex min-h-0 flex-1 items-center justify-center overflow-hidden" : "mt-4"}
      >
      <div
        ref={stageRef}
        className={`relative max-w-full border bg-white ${slot.photo || photoLimit ? "inline-block" : "w-full"} ${dragOver ? "border-[#241B16]" : "border-[#EADBCE]"}`}
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
          <>
            {/* Local blob preview. next/image does not apply. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={slot.photo.url}
              alt={`Fotografía del ${label.toLowerCase()}, solo en este navegador`}
              aria-hidden={showingClean}
              className={showingClean ? "hidden" : "block max-w-full"}
              style={photoStyle}
              draggable={false}
            />
            <canvas
              ref={canvasRef}
              width={previewPixels(slot.photo.width, slot.photo.height).width}
              height={previewPixels(slot.photo.width, slot.photo.height).height}
              role="img"
              aria-label={`Iris aislado del ${label.toLowerCase()}, derivado en este navegador`}
              aria-hidden={!showingClean}
              className={showingClean ? "block max-w-full" : "hidden"}
              style={photoStyle}
            />
          </>
        ) : (
          <div
            className="aspect-square bg-[#F6F1EA]"
            style={photoLimit ? { width: photoLimit, height: photoLimit } : { width: "100%" }}
          >
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
            {showingClean && slot.mask ? (
              <>
                {Math.abs(slot.mask.radius - slot.fit.ri) > 1 ? (
                  <div
                    className="pointer-events-none absolute rounded-full border border-dashed border-[#3D6B7A]"
                    style={circleStyle(slot.fit.cx, slot.fit.cy, slot.mask.radius, slot.photo)}
                  />
                ) : null}
                {slot.mask.lidTop > 0 ? (
                  <div
                    className="pointer-events-none absolute border-t border-dashed border-[#7A5C3D]"
                    style={chordStyle(slot.fit.cx, slot.fit.cy, slot.mask.radius, slot.fit.cy - slot.mask.radius + slot.mask.lidTop, slot.photo)}
                  />
                ) : null}
                {slot.mask.lidBottom > 0 ? (
                  <div
                    className="pointer-events-none absolute border-t border-dashed border-[#7A5C3D]"
                    style={chordStyle(slot.fit.cx, slot.fit.cy, slot.mask.radius, slot.fit.cy + slot.mask.radius - slot.mask.lidBottom, slot.photo)}
                  />
                ) : null}
                <FitHandle
                  mode="mask"
                  label="Radio de la máscara"
                  x={slot.fit.cx + slot.mask.radius * Math.sin(-Math.PI / 3)}
                  y={slot.fit.cy - slot.mask.radius * Math.cos(-Math.PI / 3)}
                  photo={slot.photo}
                  dragRef={dragRef}
                />
                <FitHandle
                  mode="lidTop"
                  label="Recorte del párpado superior"
                  x={slot.fit.cx}
                  y={slot.fit.cy - slot.mask.radius + slot.mask.lidTop}
                  photo={slot.photo}
                  dragRef={dragRef}
                />
                <FitHandle
                  mode="lidBottom"
                  label="Recorte del párpado inferior"
                  x={slot.fit.cx}
                  y={slot.fit.cy + slot.mask.radius - slot.mask.lidBottom}
                  photo={slot.photo}
                  dragRef={dragRef}
                />
              </>
            ) : null}
          </>
        ) : null}
      </div>
      </div>

      {slot.photoError ? <p className="mt-2 text-sm text-[#6D5E52]">{slot.photoError}</p> : null}
      {expanded ? null : (
        <>
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
        </>
      )}

      {expanded ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <label className="flex items-center gap-2">
            Opacidad
            <input
              className="w-28"
              type="range"
              min={0}
              max={100}
              aria-label={`Opacidad del mapa, ${label}`}
              value={Math.round(slot.opacity * 100)}
              onChange={(event) => onSlot({ opacity: Number(event.target.value) / 100 })}
            />
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={slot.pupilBlack}
              onChange={(event) => onSlot({ pupilBlack: event.target.checked })}
            />
            Pupila negra
          </label>
          {slot.photo && slot.fit ? (
            <span className="flex items-center gap-2">
              {showingClean ? (
                <GhostButton type="button" onClick={() => onSlot({ view: "original" })}>
                  Original
                </GhostButton>
              ) : (
                <Button type="button" onClick={() => onSlot({ view: "original" })}>
                  Original
                </Button>
              )}
              {showingClean ? (
                <Button type="button" onClick={cleanThisImage}>
                  Solo iris
                </Button>
              ) : (
                <GhostButton type="button" onClick={cleanThisImage}>
                  Solo iris
                </GhostButton>
              )}
            </span>
          ) : null}
          <GhostButton type="button" onClick={() => onSlot({ overlayVisible: !slot.overlayVisible })} disabled={!loaded}>
            {slot.overlayVisible ? "Ocultar mapa" : "Mostrar mapa"}
          </GhostButton>
          {slot.photo && slot.fit ? (
            <label className="flex items-center gap-2">
              Rotación {Math.round(slot.fit.rotation)}°
              <input
                className="w-28"
                type="range"
                min={-180}
                max={180}
                aria-label={`Rotación, ${label}`}
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
          ) : null}
          {showingClean && slot.mask ? (
            <label className="flex items-center gap-2">
              Suavizado {Math.round(slot.mask.feather)} px
              <input
                className="w-28"
                type="range"
                min={0}
                max={Math.max(1, Math.round(slot.mask.radius * 0.45))}
                aria-label={`Suavizado del borde, ${label}`}
                value={Math.round(slot.mask.feather)}
                onChange={(event) => setMask({ ...slot.mask!, feather: Number(event.target.value) })}
              />
            </label>
          ) : null}
        </div>
      ) : null}

      <div className={`mt-4 flex flex-wrap gap-2 ${expanded ? "hidden" : ""}`}>
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
        <GhostButton type="button" disabled={!slot.photo || !slot.fit || busyExport} onClick={() => onExport("active")}>
          {busyExport ? "Exportando…" : showingClean ? "Descargar solo iris" : slot.mask ? "Descargar original" : "Descargar PNG"}
        </GhostButton>
        {slot.mask ? (
          <GhostButton type="button" disabled={!slot.photo || !slot.fit || busyExport} onClick={() => onExport("other")}>
            {showingClean ? "Descargar original" : "Descargar solo iris"}
          </GhostButton>
        ) : null}
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

      <div className={`mt-3 flex flex-wrap items-center gap-2 text-sm ${expanded ? "hidden" : ""}`}>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={slot.pupilBlack}
            onChange={(event) => onSlot({ pupilBlack: event.target.checked })}
          />
          Pupila negra
        </label>
        {slot.photo && slot.fit ? (
          slot.mask ? (
            <span className="flex items-center gap-2">
              {showingClean ? (
                <GhostButton type="button" onClick={() => onSlot({ view: "original" })}>
                  Original
                </GhostButton>
              ) : (
                <Button type="button" onClick={() => onSlot({ view: "original" })}>
                  Original
                </Button>
              )}
              {showingClean ? (
                <Button type="button" onClick={() => onSlot({ view: "clean" })}>
                  Solo iris
                </Button>
              ) : (
                <GhostButton type="button" onClick={() => onSlot({ view: "clean" })}>
                  Solo iris
                </GhostButton>
              )}
            </span>
          ) : (
            <GhostButton type="button" onClick={cleanThisImage}>
              Limpiar imagen
            </GhostButton>
          )
        ) : null}
      </div>

      {!expanded && slot.photo && slot.fit ? (
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
          {slot.mask ? (
            <>
              <label>
                Radio de la máscara ({Math.round(slot.mask.radius)} px)
                <input
                  className="mt-1 block w-full"
                  type="range"
                  min={8}
                  max={Math.round(maskLimit(slot.photo.width, slot.photo.height))}
                  aria-label={`Radio de la máscara, ${label}`}
                  value={Math.round(slot.mask.radius)}
                  onChange={(event) => setMask({ ...slot.mask!, radius: Number(event.target.value) }, false)}
                />
              </label>
              <label>
                Suavizado del borde ({Math.round(slot.mask.feather)} px)
                <input
                  className="mt-1 block w-full"
                  type="range"
                  min={0}
                  max={Math.round(slot.mask.radius * 0.45)}
                  aria-label={`Suavizado del borde, ${label}`}
                  value={Math.round(slot.mask.feather)}
                  onChange={(event) => setMask({ ...slot.mask!, feather: Number(event.target.value) })}
                />
              </label>
              <label>
                Párpado superior ({Math.round(slot.mask.lidTop)} px)
                <input
                  className="mt-1 block w-full"
                  type="range"
                  min={0}
                  max={Math.round(slot.mask.radius * 0.9)}
                  aria-label={`Párpado superior, ${label}`}
                  value={Math.round(slot.mask.lidTop)}
                  onChange={(event) => setMask({ ...slot.mask!, lidTop: Number(event.target.value) })}
                />
              </label>
              <label>
                Párpado inferior ({Math.round(slot.mask.lidBottom)} px)
                <input
                  className="mt-1 block w-full"
                  type="range"
                  min={0}
                  max={Math.round(slot.mask.radius * 0.9)}
                  aria-label={`Párpado inferior, ${label}`}
                  value={Math.round(slot.mask.lidBottom)}
                  onChange={(event) => setMask({ ...slot.mask!, lidBottom: Number(event.target.value) })}
                />
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={slot.maskLinked}
                  onChange={(event) => {
                    const linked = event.target.checked;
                    setMask({ ...slot.mask!, radius: linked ? slot.fit!.ri : slot.mask!.radius }, linked);
                  }}
                />
                Seguir el borde del iris
              </label>
              <p className="text-xs text-[#6D5E52]">
                La foto original no cambia. Solo iris tapa párpados, pestañas, esclerótica y piel fuera del anillo. El
                asa de las 10 ajusta el radio de la máscara; las asas de arriba y abajo recortan el párpado. La pupila
                de la foto sigue ahí, salvo que actives Pupila negra.
              </p>
            </>
          ) : null}
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

const PREVIEW_LONG_SIDE = 1400;

function previewPixels(width: number, height: number) {
  const scale = Math.min(1, PREVIEW_LONG_SIDE / Math.max(width, height));
  return {
    width: Math.max(2, Math.round(width * scale)),
    height: Math.max(2, Math.round(height * scale)),
  };
}

function circleStyle(cx: number, cy: number, radius: number, photo: Photo) {
  return {
    left: `${((cx - radius) / photo.width) * 100}%`,
    top: `${((cy - radius) / photo.height) * 100}%`,
    width: `${((radius * 2) / photo.width) * 100}%`,
    height: `${((radius * 2) / photo.height) * 100}%`,
  };
}

function chordStyle(cx: number, cy: number, radius: number, y: number, photo: Photo) {
  const dy = y - cy;
  const half = Math.sqrt(Math.max(0, radius * radius - dy * dy));
  return {
    left: `${((cx - half) / photo.width) * 100}%`,
    top: `${(y / photo.height) * 100}%`,
    width: `${((half * 2) / photo.width) * 100}%`,
  };
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
          : mode === "mask"
            ? "bg-[#3D6B7A]"
            : mode === "lidTop" || mode === "lidBottom"
              ? "bg-[#7A5C3D]"
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
