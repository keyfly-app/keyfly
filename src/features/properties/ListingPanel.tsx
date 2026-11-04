"use client";

import { useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/Icon";
import { toast } from "@/components/Toaster";
import { Dialog, DialogActions } from "@/components/ui/Dialog";
import { Button, FieldError, INPUT_CLASS, Label, Notice, Optional, buttonClass } from "@/components/ui/form";
import { MenuPopover } from "@/components/ui/MenuPopover";
import { offered, type CatalogOption } from "@/features/catalog/types";
import { groupDigits } from "./format";
import {
  addLink,
  cancelVideoUpload,
  deletePhoto,
  finishVideoUpload,
  removeLink,
  saveAd,
  saveTerms,
  setCover,
  startVideoUpload,
  uploadPhoto,
  type ListingState,
  type TermsInput,
} from "./listing-actions";

export type PhotoView = { id: string; url: string | null; cover: boolean; width: number | null; height: number | null };
export type VideoView = { id: string; url: string | null; bytes: number | null };
export type LinkView = { id: string; label: string; url: string; host: string };
export type ListingProps = {
  propertyId: string;
  name: string;
  editable: boolean;
  photos: PhotoView[];
  maxPhotos: number;
  videos: VideoView[];
  maxVideos: number;
  videoLinks: LinkView[];
  terms: Omit<TermsInput, "propertyId">;
  pets: CatalogOption[];
  smoking: CatalogOption[];
  parkingOptions: { id: string; name: string }[];
  ad: { title: string; description: string };
  links: LinkView[];
};

const MAX_UPLOAD = 950 * 1024;
const MAX_SIDE = 2000;

/** Shrinks a photo in the browser to WEBP (JPEG where WEBP cannot be written) under the upload limit; keeps its orientation. */
async function shrink(file: File): Promise<{ blob: Blob; width: number; height: number } | null> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return null;
  }
  let scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  for (let round = 0; round < 4; round++) {
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
    for (const q of [0.86, 0.76, 0.66]) {
      let blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", q));
      if (!blob || blob.type !== "image/webp") blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", q));
      if (blob && blob.size <= MAX_UPLOAD) return { blob, width: w, height: h };
    }
    scale *= 0.75;
  }
  return null;
}

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
      <div className="flex min-h-9 items-center justify-between gap-3">
        <h2 className="text-[15px] leading-5 font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
const MAX_PHOTO_FILE = 25 * 1024 * 1024;
const MAX_VIDEO_FILE = 50 * 1024 * 1024;

/** Some systems hand over a .mov or .mp4 without a type; the extension decides then. */
function videoType(file: File) {
  if (VIDEO_TYPES.includes(file.type)) return file.type;
  if (file.type) return null;
  if (/\.mov$/i.test(file.name)) return "video/quicktime";
  if (/\.mp4$/i.test(file.name)) return "video/mp4";
  if (/\.webm$/i.test(file.name)) return "video/webm";
  return null;
}

/** Sends a video to its one-off upload link, reporting progress (the Supabase client has no progress events). */
function putVideo(signedUrl: string, file: File, type: string, onProgress: (percent: number) => void) {
  return new Promise<boolean>((resolve) => {
    const body = new FormData();
    body.append("cacheControl", "3600");
    body.append("", new File([file], file.name, { type }));
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
    xhr.onerror = () => resolve(false);
    xhr.send(body);
  });
}

function TileMenu({ label, closeLabel, children }: { label: string; closeLabel: string; children: React.ReactNode }) {
  return (
    <div className="absolute top-1.5 right-1.5">
      <MenuPopover
        title={label}
        closeLabel={closeLabel}
        align="end"
        width={220}
        trigger={({ ref, open, toggle, menuId }) => (
          <button
            ref={ref}
            type="button"
            onClick={toggle}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls={open ? menuId : undefined}
            aria-label={label}
            className="flex size-9 items-center justify-center rounded-lg bg-surface/95 text-ink shadow-sm hover:bg-surface"
          >
            <Icon name="more" size={16} />
          </button>
        )}
      >
        {children}
      </MenuPopover>
    </div>
  );
}

const MENU_ITEM = "flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-left text-sm hover:bg-paper focus-visible:bg-paper sm:min-h-10";

/** "Fotók és videók": photos (resized in the browser, one is the cover), uploaded videos and video links. */
function Media({ p }: { p: ListingProps }) {
  const t = useTranslations("properties.listing.photos");
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<number | "photos" | null>(null);
  const [deleting, setDeleting] = useState<{ id: string; video: boolean } | null>(null);
  const [playing, setPlaying] = useState<VideoView | null>(null);
  const [pending, start] = useTransition();
  const photosLeft = p.maxPhotos - p.photos.length;
  const videosLeft = p.maxVideos - p.videos.length;

  const uploadVideo = async (file: File, type: string) => {
    if (file.size > MAX_VIDEO_FILE) return toast(t("errors.videoSize"), "error"), false;
    setBusy(0);
    const s = await startVideoUpload(p.propertyId, type, file.size);
    if (s.status !== "ready") {
      const key = s.error === "limit" ? "videoLimit" : s.error === "size" ? "videoSize" : s.error === "type" ? "videoType" : "generic";
      return toast(t(`errors.${key}`, { max: p.maxVideos }), "error"), false;
    }
    const sent = await putVideo(s.signedUrl, file, type, setBusy);
    const r = sent ? await finishVideoUpload(p.propertyId, s.path) : null;
    if (!sent) await cancelVideoUpload(p.propertyId, s.path);
    if (r?.status === "saved") return true;
    const key = r?.status === "error" && r.error === "limit" ? "videoLimit" : r?.status === "error" && r.error === "type" ? "videoType" : "generic";
    toast(t(`errors.${key}`, { max: p.maxVideos }), "error");
    return false;
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    let photos = 0;
    let videos = 0;
    const list = [...files];
    const images = list.filter((f) => !videoType(f));
    const clips = list.flatMap((f) => (videoType(f) ? [{ file: f, type: videoType(f)! }] : []));
    if (images.length > photosLeft) toast(t("errors.limit", { max: p.maxPhotos }), "error");
    if (clips.length > videosLeft) toast(t("errors.videoLimit", { max: p.maxVideos }), "error");
    for (const file of images.slice(0, Math.max(0, photosLeft))) {
      setBusy("photos");
      if (!PHOTO_TYPES.includes(file.type)) {
        toast(t("errors.type"), "error");
        continue;
      }
      if (file.size > MAX_PHOTO_FILE) {
        toast(t("errors.photoSize"), "error");
        continue;
      }
      const small = await shrink(file);
      if (!small) {
        toast(t("errors.type"), "error");
        continue;
      }
      const data = new FormData();
      data.set("propertyId", p.propertyId);
      data.set("photo", new File([small.blob], small.blob.type === "image/webp" ? "photo.webp" : "photo.jpg", { type: small.blob.type }));
      data.set("width", String(small.width));
      data.set("height", String(small.height));
      const r = await uploadPhoto(data);
      if (r.status === "saved") photos += 1;
      else toast(t(`errors.${r.status === "error" && (r.error === "type" || r.error === "limit") ? r.error : "generic"}`, { max: p.maxPhotos }), "error");
    }
    for (const c of clips.slice(0, Math.max(0, videosLeft))) if (await uploadVideo(c.file, c.type)) videos += 1;
    setBusy(null);
    if (input.current) input.current.value = "";
    if (photos) toast(t("uploaded", { count: photos }));
    if (videos) toast(t("videoUploaded", { count: videos }));
    if (photos || videos) router.refresh();
  };

  const act = (fn: () => Promise<ListingState>, ok: string) =>
    start(async () => {
      const r = await fn();
      setDeleting(null);
      if (r.status === "saved") {
        toast(ok);
        router.refresh();
      } else toast(t("errors.save"), "error");
    });

  const counts = [
    p.photos.length > 0 && t("count", { count: p.photos.length }),
    p.videos.length > 0 && t("videoCount", { count: p.videos.length }),
  ].filter(Boolean);
  const accept = [...(photosLeft > 0 ? PHOTO_TYPES : []), ...(videosLeft > 0 ? [...VIDEO_TYPES, ".mov"] : [])].join(",");

  return (
    <Card title={t("title")} action={counts.length > 0 && <span className="text-[13px] text-muted">{counts.join(" · ")}</span>}>
      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        {p.photos.map((ph, i) => (
          <li key={ph.id} className="relative aspect-[4/3] rounded-lg bg-mist">
            {ph.url && (
              // Signed links to the private bucket change every hour; Next's optimiser would cache them.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ph.url} alt={t("photoAlt", { name: p.name, n: i + 1 })} loading="lazy" className="size-full rounded-lg object-cover" />
            )}
            {ph.cover && (
              <span className="absolute top-2 left-2 inline-flex h-6 items-center gap-1 rounded-md bg-surface/95 px-2 text-[11.5px] font-semibold shadow-sm">
                <Icon name="star" size={12} strokeWidth={2} />
                {t("cover")}
              </span>
            )}
            {p.editable && (
              <TileMenu label={t("more", { n: i + 1 })} closeLabel={t("close")}>
                {!ph.cover && (
                  <button type="button" role="menuitem" onClick={() => act(() => setCover(p.propertyId, ph.id), t("coverSet"))} className={MENU_ITEM}>
                    <Icon name="star" size={16} strokeWidth={1.75} className="flex-none text-muted" />
                    {t("makeCover")}
                  </button>
                )}
                <button type="button" role="menuitem" onClick={() => setDeleting({ id: ph.id, video: false })} className={`${MENU_ITEM} text-danger-ink`}>
                  <Icon name="trash" size={16} strokeWidth={1.75} className="flex-none" />
                  {t("delete")}
                </button>
              </TileMenu>
            )}
          </li>
        ))}
        {p.videos.map((v, i) => (
          <li key={v.id} className="relative aspect-[4/3] rounded-lg bg-ink">
            <button
              type="button"
              onClick={() => setPlaying(v)}
              disabled={!v.url}
              aria-label={t("play", { n: i + 1 })}
              className="group relative block size-full overflow-hidden rounded-lg"
            >
              {v.url && <video src={`${v.url}#t=0.1`} preload="metadata" muted playsInline className="size-full object-cover" aria-hidden="true" />}
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex size-11 items-center justify-center rounded-full bg-surface/95 text-ink shadow-sm group-hover:bg-surface">
                  <Icon name="play" size={18} strokeWidth={2} />
                </span>
              </span>
              <span className="absolute bottom-2 left-2 inline-flex h-6 items-center rounded-md bg-ink/80 px-2 text-[11.5px] font-semibold text-surface">
                {t("video")}
              </span>
            </button>
            {p.editable && (
              <TileMenu label={t("videoMore", { n: i + 1 })} closeLabel={t("close")}>
                <button type="button" role="menuitem" onClick={() => setDeleting({ id: v.id, video: true })} className={`${MENU_ITEM} text-danger-ink`}>
                  <Icon name="trash" size={16} strokeWidth={1.75} className="flex-none" />
                  {t("delete")}
                </button>
              </TileMenu>
            )}
          </li>
        ))}
        {p.editable && (photosLeft > 0 || videosLeft > 0) && (
          <li className="aspect-[4/3]">
            <label
              className={`flex size-full cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-field px-2 text-center hover:border-ink has-focus-visible:outline-3 has-focus-visible:outline-brand ${busy !== null ? "cursor-progress opacity-70" : ""}`}
            >
              <input ref={input} type="file" accept={accept} multiple disabled={busy !== null} onChange={(e) => void upload(e.target.files)} className="sr-only" />
              <Icon name="upload" size={18} strokeWidth={1.9} className="text-brand" />
              <span className="text-[13.5px] font-semibold text-brand" aria-live="polite">
                {busy === null ? t("upload") : typeof busy === "number" ? t("uploadingPercent", { percent: busy }) : t("uploading")}
              </span>
              <span className="text-[11.5px] text-muted">{t(photosLeft > 0 && videosLeft > 0 ? "uploadSub" : photosLeft > 0 ? "uploadPhoto" : "uploadVideo")}</span>
            </label>
          </li>
        )}
      </ul>
      {p.editable && (
        <ul className="flex flex-col gap-0.5 text-[12.5px] leading-[18px] text-muted">
          <li>{t("photoRules", { max: p.maxPhotos })}</li>
          <li>{t("videoRules", { max: p.maxVideos })}</li>
        </ul>
      )}
      {!p.editable && p.photos.length === 0 && p.videos.length === 0 && <p className="text-sm text-muted">{t("empty")}</p>}
      {(p.editable || p.videoLinks.length > 0) && (
        <div className="border-t border-paper pt-4">
          <LinkSection p={p} kind="video" />
        </div>
      )}
      <Dialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={t(deleting?.video ? "deleteDialog.videoTitle" : "deleteDialog.title")}
        closeLabel={t("close")}
      >
        <DialogActions>
          <button type="button" onClick={() => setDeleting(null)} className={buttonClass("secondary")} data-autofocus>
            {t("deleteDialog.cancel")}
          </button>
          <form
            action={() => {
              if (deleting) act(() => deletePhoto(p.propertyId, deleting.id), t(deleting.video ? "videoDeleted" : "deleted"));
            }}
          >
            <Button variant="danger" pending={pending}>
              {t("deleteDialog.confirm")}
            </Button>
          </form>
        </DialogActions>
      </Dialog>
      <Dialog open={playing !== null} onClose={() => setPlaying(null)} title={t("video")} closeLabel={t("close")} wide>
        {playing?.url && <video src={playing.url} controls autoPlay playsInline className="max-h-[70vh] w-full rounded-lg bg-ink" />}
      </Dialog>
    </Card>
  );
}

function Unit({
  id,
  label,
  value,
  onChange,
  unit,
  error,
  optional,
  max = 11,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit: string;
  error?: string;
  optional?: string;
  max?: number;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>
        {label} {optional && <Optional>{optional}</Optional>}
      </Label>
      <div className="relative">
        <input
          id={id}
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => max > 3 && onChange(groupDigits(e.target.value))}
          maxLength={max}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`${INPUT_CLASS} pr-16 tabular-nums disabled:opacity-60`}
        />
        <span aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[13px] text-muted">
          {unit}
        </span>
      </div>
      {error && <FieldError id={`${id}-error`} message={error} />}
    </div>
  );
}

function Terms({ p }: { p: ListingProps }) {
  const t = useTranslations("properties.listing.terms");
  const e = useTranslations("properties.listing.errors");
  const id = useId();
  const router = useRouter();
  const [v, setV] = useState(p.terms);
  const [state, setState] = useState<ListingState>({ status: "idle" });
  const [pending, start] = useTransition();
  const f = state.status === "error" ? (state.fields ?? {}) : {};
  const set =
    <K extends keyof typeof v>(k: K) =>
    (x: (typeof v)[K]) =>
      setV((s) => ({ ...s, [k]: x }));
  const err = (k: string, min = 0, max = 0) => (f[k] === "range" ? e("range", { min, max }) : f[k] ? e(f[k] === "date" ? "date" : "amount") : undefined);
  const select = (key: "pets" | "smoking", label: string, options: CatalogOption[]) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`${id}-${key}`}>{label}</Label>
      <select
        id={`${id}-${key}`}
        value={v[key]}
        onChange={(ev) => set(key)(ev.target.value)}
        disabled={!p.editable}
        className={`${INPUT_CLASS} appearance-auto ${v[key] ? "" : "text-muted"}`}
      >
        <option value="">{t("choose")}</option>
        {offered(options).map((o) => (
          <option key={o.key} value={o.key} className="text-ink">
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    start(async () => {
      const r = await saveTerms({ propertyId: p.propertyId, ...v });
      setState(r);
      if (r.status === "saved") {
        toast(t("saved"));
        router.refresh();
      }
    });
  };
  const seg =
    "flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-md px-2 text-[13px] font-medium text-muted has-checked:bg-surface has-checked:text-ink has-checked:shadow-[0_1px_2px_rgb(12_31_25/0.12)] has-focus-visible:outline-3 has-focus-visible:outline-brand sm:min-h-10";
  return (
    <Card title={t("title")}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        {state.status === "error" && state.error && <Notice kind="error">{e(state.error === "notAllowed" ? "notAllowed" : "generic")}</Notice>}
        <fieldset disabled={!p.editable} className="grid gap-4 sm:grid-cols-2 sm:gap-x-3">
          <Unit id={`${id}-rent`} label={t("rent")} value={v.rent} onChange={set("rent")} unit={t("perMonth")} error={err("rent", 1, 999999999)} />
          <fieldset>
            <legend className="mb-1.5 text-[13px] font-medium">{t("currency")}</legend>
            <div className="flex rounded-lg bg-paper p-0.5">
              {(["HUF", "EUR"] as const).map((c) => (
                <label key={c} className={seg}>
                  <input type="radio" name={`${id}-cur`} checked={v.currency === c} onChange={() => set("currency")(c)} className="sr-only" />
                  {t(c === "HUF" ? "huf" : "eur")}
                </label>
              ))}
            </div>
          </fieldset>
          <Unit
            id={`${id}-dep`}
            label={t("deposit")}
            value={v.depositMonths}
            onChange={set("depositMonths")}
            unit={t("depositUnit")}
            max={2}
            error={err("depositMonths", 0, 12)}
          />
          <fieldset>
            <legend className="mb-1.5 text-[13px] font-medium">{t("available")}</legend>
            <div className="flex rounded-lg bg-paper p-0.5">
              {([true, false] as const).map((now) => (
                <label key={String(now)} className={seg}>
                  <input type="radio" name={`${id}-av`} checked={v.availableNow === now} onChange={() => set("availableNow")(now)} className="sr-only" />
                  {t(now ? "now" : "fromDate")}
                </label>
              ))}
            </div>
          </fieldset>
          {!v.availableNow && (
            <div className="flex flex-col gap-1.5 sm:col-span-2 sm:max-w-[calc(50%-6px)]">
              <Label htmlFor={`${id}-from`}>{t("availableFrom")}</Label>
              <input
                id={`${id}-from`}
                type="date"
                max="9999-12-31"
                value={v.availableFrom}
                onChange={(ev) => set("availableFrom")(ev.target.value)}
                aria-invalid={f.availableFrom ? true : undefined}
                className={INPUT_CLASS}
              />
              {f.availableFrom && <FieldError id={`${id}-from-error`} message={e("date")} />}
            </div>
          )}
          <Unit id={`${id}-min`} label={t("minTerm")} value={v.minTerm} onChange={set("minTerm")} unit={t("months")} max={3} error={err("minTerm", 1, 120)} />
          {select("pets", t("pets"), p.pets)}
          {select("smoking", t("smoking"), p.smoking)}
          <Unit id={`${id}-bills`} label={t("bills")} value={v.bills} onChange={set("bills")} unit={t("billsUnit")} error={err("bills", 0, 99999999)} />
          {p.parkingOptions.length > 0 && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${id}-park`}>
                  {t("parking")} <Optional>{t("optional")}</Optional>
                </Label>
                <select
                  id={`${id}-park`}
                  value={v.parkingPropertyId}
                  onChange={(ev) => set("parkingPropertyId")(ev.target.value)}
                  className={`${INPUT_CLASS} appearance-auto`}
                >
                  <option value="">{t("parkingNone")}</option>
                  {p.parkingOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
              {v.parkingPropertyId && (
                <Unit
                  id={`${id}-prent`}
                  label={t("parkingRent")}
                  value={v.parkingRent}
                  onChange={set("parkingRent")}
                  unit={t("perMonth")}
                  error={err("parkingRent", 0, 99999999)}
                />
              )}
            </>
          )}
        </fieldset>
        {p.editable && (
          <div className="flex border-t border-paper pt-4">
            <Button pending={pending} fit>
              {t("save")}
            </Button>
          </div>
        )}
      </form>
    </Card>
  );
}

function Ad({ p }: { p: ListingProps }) {
  const t = useTranslations("properties.listing.ad");
  const e = useTranslations("properties.listing.errors");
  const id = useId();
  const router = useRouter();
  const [title, setTitle] = useState(p.ad.title);
  const [text, setText] = useState(p.ad.description);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText([title.trim(), text.trim()].filter(Boolean).join("\n\n"));
      toast(t("copied"));
    } catch {
      // Clipboard refused: the text is on screen to select by hand.
    }
  };
  const save = (ev: React.FormEvent) => {
    ev.preventDefault();
    start(async () => {
      const r = await saveAd(p.propertyId, title, text);
      setError(r.status === "error");
      if (r.status === "saved") {
        toast(t("saved"));
        router.refresh();
      }
    });
  };
  return (
    <Card
      title={t("title")}
      action={
        <button
          type="button"
          onClick={copy}
          disabled={!title.trim() && !text.trim()}
          className={`${buttonClass("secondary", true)} w-auto disabled:opacity-50`}
        >
          <Icon name="copy" size={15} strokeWidth={1.9} />
          {t("copy")}
        </button>
      }
    >
      <form onSubmit={save} noValidate className="flex flex-col gap-4">
        {error && <Notice kind="error">{e("generic")}</Notice>}
        <fieldset disabled={!p.editable} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-title`}>{t("heading")}</Label>
            <input id={`${id}-title`} value={title} onChange={(ev) => setTitle(ev.target.value)} maxLength={120} className={INPUT_CLASS} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-text`}>{t("description")}</Label>
            <textarea
              id={`${id}-text`}
              value={text}
              onChange={(ev) => setText(ev.target.value)}
              maxLength={3000}
              rows={6}
              aria-describedby={`${id}-count`}
              className={`${INPUT_CLASS} h-auto min-h-36 py-2.5 leading-[22px] normal-nums`}
            />
            <p id={`${id}-count`} className="text-right text-[12px] text-muted tabular-nums">
              {t("count", { count: text.length, max: 3000 })}
            </p>
          </div>
        </fieldset>
        {p.editable && (
          <div className="flex border-t border-paper pt-4">
            <Button pending={pending} fit>
              {t("save")}
            </Button>
          </div>
        )}
      </form>
    </Card>
  );
}

/** A list of links with an inline add form: listing links ("Hirdetések") or video links (inside "Fotók és videók"). */
function LinkSection({ p, kind }: { p: ListingProps; kind: "listing" | "video" }) {
  const t = useTranslations(kind === "video" ? "properties.listing.videoLinks" : "properties.listing.links");
  const e = useTranslations("properties.listing.errors");
  const id = useId();
  const router = useRouter();
  const links = kind === "video" ? p.videoLinks : p.links;
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [state, setState] = useState<ListingState>({ status: "idle" });
  const [pending, start] = useTransition();
  const f = state.status === "error" ? (state.fields ?? {}) : {};
  const add = (ev: React.FormEvent) => {
    ev.preventDefault();
    start(async () => {
      const r = await addLink(p.propertyId, label, url, kind);
      setState(r);
      if (r.status === "saved") {
        toast(t("added"));
        setAdding(false);
        setLabel("");
        setUrl("");
        router.refresh();
      }
    });
  };
  const remove = (l: LinkView) =>
    start(async () => {
      const r = await removeLink(p.propertyId, l.id);
      if (r.status === "saved") {
        toast(t("removed"));
        router.refresh();
      } else toast(e("generic"), "error");
    });
  const Heading = kind === "video" ? "h3" : "h2";
  return (
    <div className="flex flex-col gap-4">
      <div className="flex min-h-9 items-center justify-between gap-3">
        <Heading className={kind === "video" ? "text-sm font-semibold" : "text-[15px] leading-5 font-semibold"}>{t("title")}</Heading>
        {p.editable && !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex min-h-11 items-center text-[13.5px] font-semibold text-brand hover:underline sm:min-h-6"
          >
            {t("add")}
          </button>
        )}
      </div>
      {links.length === 0 && !adding && <p className="text-sm text-muted">{t("empty")}</p>}
      {links.length > 0 && (
        <ul className="flex flex-col">
          {links.map((l) => (
            <li key={l.id} className="flex items-center gap-3 border-t border-paper py-2.5 first:border-t-0 first:pt-0">
              <span
                aria-hidden="true"
                className="flex size-8 flex-none items-center justify-center rounded-lg bg-ink text-[13px] font-semibold text-lime uppercase"
              >
                {kind === "video" ? <Icon name="play" size={14} strokeWidth={2} /> : l.label.slice(0, 1)}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-semibold [overflow-wrap:anywhere]">{l.label}</span>
                <span className="truncate text-[12.5px] text-muted">{l.host}</span>
              </span>
              <a
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("open", { name: l.label })}
                className="flex size-11 flex-none items-center justify-center rounded-lg text-brand hover:bg-paper sm:size-9"
              >
                <Icon name="external" size={16} strokeWidth={1.8} />
              </a>
              {p.editable && (
                <button
                  type="button"
                  onClick={() => remove(l)}
                  aria-label={t("remove", { name: l.label })}
                  className="flex size-11 flex-none items-center justify-center rounded-lg text-muted hover:bg-paper hover:text-danger-ink sm:size-9"
                >
                  <Icon name="trash" size={15} strokeWidth={1.8} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {adding && (
        <form onSubmit={add} noValidate className="flex flex-col gap-3 rounded-lg bg-paper p-3.5">
          <div className={`grid gap-3 ${kind === "video" ? "sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]" : "sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"}`}>
            {kind === "video" && urlField()}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-label`}>
                {t("label")} {kind === "video" && <Optional>{t("optional")}</Optional>}
              </Label>
              <input
                id={`${id}-label`}
                value={label}
                onChange={(ev) => setLabel(ev.target.value)}
                placeholder={t("labelPlaceholder")}
                maxLength={60}
                aria-invalid={f.label ? true : undefined}
                className={INPUT_CLASS}
                autoFocus={kind === "listing"}
              />
              {f.label && <FieldError id={`${id}-label-error`} message={e("label")} />}
            </div>
            {kind === "listing" && urlField()}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button pending={pending} fit>
              {t("save")}
            </Button>
            <button type="button" onClick={() => setAdding(false)} className={buttonClass("secondary", true)}>
              {t("cancel")}
            </button>
          </div>
        </form>
      )}
    </div>
  );

  function urlField() {
    return (
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-url`}>{t("url")}</Label>
        <input
          id={`${id}-url`}
          type="url"
          inputMode="url"
          value={url}
          onChange={(ev) => setUrl(ev.target.value)}
          placeholder={t("urlPlaceholder")}
          maxLength={500}
          aria-invalid={f.url ? true : undefined}
          className={INPUT_CLASS}
          autoFocus={kind === "video"}
        />
        {f.url && <FieldError id={`${id}-url-error`} message={e("url")} />}
      </div>
    );
  }
}

function Links({ p }: { p: ListingProps }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <LinkSection p={p} kind="listing" />
    </section>
  );
}

/** "Fotók és hirdetés" (canvas "Ingatlan – fotók és hirdetés"): photos and videos, rental terms, listing text and links. */
export function ListingPanel(p: ListingProps) {
  return (
    <div className="flex flex-col gap-4">
      <Media p={p} />
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <Terms p={p} />
        <div className="flex flex-col gap-4">
          <Ad p={p} />
          <Links p={p} />
        </div>
      </div>
    </div>
  );
}
