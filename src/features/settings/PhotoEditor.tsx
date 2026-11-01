"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { Dialog, DialogActions } from "@/components/ui/Dialog";
import { Button, Notice } from "@/components/ui/form";
import { removePhoto, uploadPhoto, type SettingsState } from "./actions";

const MAX_FILE = 10 * 1024 * 1024;
const OUT = 512; // saved size, px
const IDLE: SettingsState = { status: "idle" };

type Picked = { url: string; width: number; height: number };

/**
 * Profile photo (canvas "Profilkép kivágása"): pick a file, drag and zoom it inside a circle, and the browser
 * saves a 512 × 512 square – no original photo ever leaves the device.
 */
export function PhotoEditor({ avatarUrl, initials }: { avatarUrl: string | null; initials: string }) {
  const t = useTranslations("settings");
  const input = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [uploaded, upload, uploading] = useActionState(async (prev: SettingsState, form: FormData) => {
    const next = await uploadPhoto(prev, form);
    if (next.status === "saved") setPicked(null);
    return next;
  }, IDLE);
  const [removed, remove, removing] = useActionState(removePhoto, IDLE);
  const result = [uploaded, removed].find((s) => s.status !== "idle");

  useEffect(() => () => void (picked && URL.revokeObjectURL(picked.url)), [picked]);

  const onFile = (file: File | undefined) => {
    setLocalError(null);
    if (!file) return;
    if (file.size > MAX_FILE) return setLocalError(t("errors.photoSize"));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => setPicked({ url, width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setLocalError(t("errors.photoType"));
    };
    img.src = url;
  };

  const message =
    localError ?? (result?.status === "error" ? t(`errors.${result.error}`) : result?.status === "saved" ? t(`saved.${result.saved}`) : null);

  return (
    <section aria-labelledby="photo-title" className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5 sm:p-6">
      <h2 id="photo-title" className="text-[15px] font-semibold">
        {t("profile.photo")}
      </h2>
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <Avatar src={avatarUrl} initials={initials} size={72} />
        <div className="flex flex-col items-center gap-2 sm:items-start">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => input.current?.click()}
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-field bg-surface px-3.5 text-[13px] font-medium hover:border-ink sm:h-9"
            >
              <Icon name="camera" size={16} />
              {avatarUrl ? t("profile.replace") : t("profile.upload")}
            </button>
            {avatarUrl && (
              <form action={remove}>
                <button type="submit" disabled={removing} className="inline-flex h-11 items-center rounded-lg px-3 text-[13px] font-medium text-muted hover:text-ink sm:h-9">
                  {t("profile.remove")}
                </button>
              </form>
            )}
          </div>
          <p className="text-[12.5px] text-muted">{t("profile.photoHint")}</p>
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {message && <Notice kind={localError || result?.status === "error" ? "error" : "success"}>{message}</Notice>}
      {picked && (
        <CropDialog
          picked={picked}
          pending={uploading}
          onClose={() => setPicked(null)}
          onSave={(blob) => {
            const form = new FormData();
            form.set("photo", blob, blob.type === "image/webp" ? "photo.webp" : "photo.jpg");
            startTransition(() => upload(form));
          }}
        />
      )}
    </section>
  );
}

function CropDialog({ picked, pending, onClose, onSave }: { picked: Picked; pending: boolean; onClose: () => void; onSave: (blob: Blob) => void }) {
  const t = useTranslations("settings.dialogs");
  const stage = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(280);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    const measure = () => setSize(stage.current?.clientWidth ?? 280);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // The photo always covers the circle: "cover" scale × zoom, offsets clamped to the overhang.
  const base = Math.max(size / picked.width, size / picked.height);
  const w = picked.width * base * zoom;
  const h = picked.height * base * zoom;
  const clamp = (o: { x: number; y: number }) => ({
    x: Math.max(-(w - size) / 2, Math.min((w - size) / 2, o.x)),
    y: Math.max(-(h - size) / 2, Math.min((h - size) / 2, o.y)),
  });
  const pos = clamp(offset);

  const save = () => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = OUT;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      if (!ctx) return;
      const k = OUT / size;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, (size / 2 + pos.x - w / 2) * k, (size / 2 + pos.y - h / 2) * k, w * k, h * k);
      canvas.toBlob(
        (webp) => {
          if (webp && webp.type === "image/webp") return onSave(webp);
          canvas.toBlob((jpeg) => jpeg && onSave(jpeg), "image/jpeg", 0.88); // Safari cannot encode WebP
        },
        "image/webp",
        0.88,
      );
    };
    img.src = picked.url;
  };

  const onKey = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 40 : 10;
    const moves: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (moves[e.key]) {
      e.preventDefault();
      setOffset((o) => clamp({ x: o.x + moves[e.key]![0], y: o.y + moves[e.key]![1] }));
    } else if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(3, z + 0.1));
    else if (e.key === "-") setZoom((z) => Math.max(1, z - 0.1));
  };

  return (
    <Dialog open onClose={onClose} title={t("cropTitle")} description={t("cropLead")} closeLabel={t("close")} wide>
      <div
        ref={stage}
        role="img"
        aria-label={t("cropAlt")}
        tabIndex={0}
        data-autofocus
        onKeyDown={onKey}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { x: e.clientX, y: e.clientY, ox: pos.x, oy: pos.y };
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          setOffset(clamp({ x: drag.current.ox + e.clientX - drag.current.x, y: drag.current.oy + e.clientY - drag.current.y }));
        }}
        onPointerUp={() => (drag.current = null)}
        className="relative mx-auto aspect-square w-full max-w-[320px] cursor-grab touch-none overflow-hidden rounded-xl bg-ink select-none active:cursor-grabbing"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
        <img
          src={picked.url}
          alt=""
          draggable={false}
          style={{ width: w, height: h, left: (size - w) / 2 + pos.x, top: (size - h) / 2 + pos.y }}
          className="pointer-events-none absolute max-w-none"
        />
        <div aria-hidden="true" className="pointer-events-none absolute inset-[6px] rounded-full shadow-[0_0_0_999px_rgb(12_31_25/0.55)]" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-[6px] rounded-full ring-2 ring-white" />
      </div>
      <label className="flex items-center gap-3 text-[13px] font-medium">
        {t("zoom")}
        <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 accent-ink" />
      </label>
      <DialogActions>
        <button type="button" onClick={onClose} className="inline-flex h-11 items-center justify-center rounded-lg border border-field px-4 text-sm font-medium hover:border-ink sm:h-10">
          {t("cancel")}
        </button>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!pending) save();
          }}
        >
          <Button pending={pending}>{t("cropSave")}</Button>
        </form>
      </DialogActions>
    </Dialog>
  );
}
