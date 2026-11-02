"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogActions } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/form";

export type PickedImage = { url: string; width: number; height: number };

const OUT = 512; // saved size, px

/**
 * Drag-and-zoom framing of a picked image, saved in the browser as a 512 × 512 square – the original never leaves the
 * device. "photo" (canvas "Profilkép kivágása"): the photo covers a circle, saved as WebP or JPEG. "logo" (v2.5
 * "Céglogó – igazítás"): the whole logo fits a rounded square on a checkerboard, transparency kept (WebP or PNG).
 * Arrow keys move (Shift: faster), + and − zoom.
 */
export function ImageCropDialog({
  picked,
  kind,
  pending,
  labels,
  onClose,
  onSave,
}: {
  picked: PickedImage;
  kind: "photo" | "logo";
  pending: boolean;
  labels: {
    title: string;
    lead: string;
    alt: string;
    zoom: string;
    cancel: string;
    save: string;
    close: string;
  };
  onClose: () => void;
  onSave: (blob: Blob) => void;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(280);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const logo = kind === "logo";
  const inset = 6; // the frame sits 6 px inside the stage

  useEffect(() => {
    const measure = () => setSize(stage.current?.clientWidth ?? 280);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // A photo always covers the frame; a logo starts fully inside it. Offsets keep the image within the frame's reach.
  const frame = size - inset * 2;
  const base = logo ? Math.min(frame / picked.width, frame / picked.height) : Math.max(frame / picked.width, frame / picked.height);
  const w = picked.width * base * zoom;
  const h = picked.height * base * zoom;
  const clamp = (o: { x: number; y: number }) => ({
    x: Math.max(-Math.abs(w - frame) / 2, Math.min(Math.abs(w - frame) / 2, o.x)),
    y: Math.max(-Math.abs(h - frame) / 2, Math.min(Math.abs(h - frame) / 2, o.y)),
  });
  const pos = clamp(offset);

  const save = () => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = OUT;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      if (!ctx) return;
      const k = OUT / frame;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, (frame / 2 + pos.x - w / 2) * k, (frame / 2 + pos.y - h / 2) * k, w * k, h * k);
      // Safari cannot encode WebP: a photo falls back to JPEG, a logo to PNG (keeps transparency).
      const fallback = logo ? "image/png" : "image/jpeg";
      canvas.toBlob(
        (webp) => {
          if (webp && webp.type === "image/webp") return onSave(webp);
          canvas.toBlob((other) => other && onSave(other), fallback, 0.88);
        },
        "image/webp",
        0.88,
      );
    };
    img.src = picked.url;
  };

  const onKey = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 40 : 10;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [step, 0],
      ArrowRight: [-step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    if (moves[e.key]) {
      e.preventDefault();
      setOffset((o) => clamp({ x: o.x + moves[e.key]![0], y: o.y + moves[e.key]![1] }));
    } else if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(3, z + 0.1));
    else if (e.key === "-") setZoom((z) => Math.max(1, z - 0.1));
  };

  const frameShape = logo ? "rounded-[18%]" : "rounded-full";
  return (
    <Dialog open onClose={onClose} title={labels.title} description={labels.lead} closeLabel={labels.close} wide>
      <div
        ref={stage}
        role="img"
        aria-label={labels.alt}
        tabIndex={0}
        data-autofocus
        onKeyDown={onKey}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { x: e.clientX, y: e.clientY, ox: pos.x, oy: pos.y };
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          setOffset(
            clamp({
              x: drag.current.ox + e.clientX - drag.current.x,
              y: drag.current.oy + e.clientY - drag.current.y,
            }),
          );
        }}
        onPointerUp={() => (drag.current = null)}
        className={`relative mx-auto aspect-square w-full max-w-[320px] cursor-grab touch-none overflow-hidden rounded-xl select-none active:cursor-grabbing ${logo ? "bg-[repeating-conic-gradient(var(--color-ink-soft)_0%_25%,var(--color-night)_0%_50%)] bg-[length:20px_20px]" : "bg-ink"}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
        <img
          src={picked.url}
          alt=""
          draggable={false}
          style={{
            width: w,
            height: h,
            left: inset + (frame - w) / 2 + pos.x,
            top: inset + (frame - h) / 2 + pos.y,
          }}
          className="pointer-events-none absolute max-w-none"
        />
        <div aria-hidden="true" className={`pointer-events-none absolute inset-[6px] ${frameShape} shadow-[0_0_0_999px_rgb(12_31_25/0.55)]`} />
        <div aria-hidden="true" className={`pointer-events-none absolute inset-[6px] ${frameShape} ring-2 ring-white`} />
      </div>
      <label className="flex items-center gap-3 text-[13px] font-medium">
        {labels.zoom}
        <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 accent-ink" />
      </label>
      <DialogActions>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-11 items-center justify-center rounded-lg border border-field px-4 text-sm font-medium hover:border-ink sm:h-10"
        >
          {labels.cancel}
        </button>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!pending) save();
          }}
        >
          <Button pending={pending}>{labels.save}</Button>
        </form>
      </DialogActions>
    </Dialog>
  );
}
