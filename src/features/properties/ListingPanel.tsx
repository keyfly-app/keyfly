"use client";

import { useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/Icon";
import { toast } from "@/components/Toaster";
import { Button, FieldError, INPUT_CLASS, Label, Notice, Optional, buttonClass } from "@/components/ui/form";
import { MenuPopover } from "@/components/ui/MenuPopover";
import { offered, type CatalogOption } from "@/features/catalog/types";
import { addLink, deletePhoto, removeLink, saveAd, saveTerms, setCover, uploadPhoto, type ListingState, type TermsInput } from "./listing-actions";

export type PhotoView = { id: string; url: string | null; cover: boolean; width: number | null; height: number | null };
export type LinkView = { id: string; label: string; url: string; host: string };
export type ListingProps = {
  propertyId: string;
  name: string;
  editable: boolean;
  photos: PhotoView[];
  maxPhotos: number;
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

function Photos({ p }: { p: ListingProps }) {
  const t = useTranslations("properties.listing.photos");
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [, start] = useTransition();
  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = [...files].slice(0, Math.max(0, p.maxPhotos - p.photos.length));
    if (list.length < files.length) toast(t("errors.limit", { max: p.maxPhotos }), "error");
    setBusy(true);
    let done = 0;
    for (const file of list) {
      const small = file.type.startsWith("image/") ? await shrink(file) : null;
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
      if (r.status === "saved") done += 1;
      else toast(t(`errors.${r.status === "error" && (r.error === "type" || r.error === "limit") ? r.error : "generic"}`, { max: p.maxPhotos }), "error");
    }
    setBusy(false);
    if (input.current) input.current.value = "";
    if (done) {
      toast(t("uploaded", { count: done }));
      router.refresh();
    }
  };
  const act = (fn: () => Promise<ListingState>, ok: string) =>
    start(async () => {
      const r = await fn();
      if (r.status === "saved") {
        toast(ok);
        router.refresh();
      } else toast(t("errors.generic"), "error");
    });

  return (
    <Card title={t("title")} action={p.photos.length > 0 && <span className="text-[13px] text-muted">{t("count", { count: p.photos.length })}</span>}>
      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        {p.photos.map((ph, i) => (
          <li key={ph.id} className="relative aspect-[4/3] overflow-hidden rounded-lg bg-mist">
            {ph.url && (
              // Signed links to the private bucket change every hour; Next's optimiser would cache them.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ph.url} alt={t("photoAlt", { name: p.name, n: i + 1 })} loading="lazy" className="size-full object-cover" />
            )}
            {ph.cover && (
              <span className="absolute top-2 left-2 inline-flex h-6 items-center gap-1 rounded-md bg-surface/95 px-2 text-[11.5px] font-semibold shadow-sm">
                <Icon name="star" size={12} strokeWidth={2} />
                {t("cover")}
              </span>
            )}
            {p.editable && (
              <div className="absolute top-1.5 right-1.5">
                <MenuPopover
                  title={t("more", { n: i + 1 })}
                  closeLabel={t("delete")}
                  align="end"
                  width={220}
                  trigger={({ ref, open, toggle, menuId }) => (
                    <button ref={ref} type="button" onClick={toggle} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined}
                      aria-label={t("more", { n: i + 1 })} className="flex size-9 items-center justify-center rounded-lg bg-surface/95 text-ink shadow-sm hover:bg-surface">
                      <Icon name="more" size={16} />
                    </button>
                  )}
                >
                  {!ph.cover && (
                    <button type="button" role="menuitem" onClick={() => act(() => setCover(p.propertyId, ph.id), t("coverSet"))}
                      className="flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-left text-sm hover:bg-paper focus-visible:bg-paper sm:min-h-10">
                      <Icon name="star" size={16} strokeWidth={1.75} className="flex-none text-muted" />
                      {t("makeCover")}
                    </button>
                  )}
                  <button type="button" role="menuitem" onClick={() => act(() => deletePhoto(p.propertyId, ph.id), t("deleted"))}
                    className="flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-left text-sm text-danger-ink hover:bg-paper focus-visible:bg-paper sm:min-h-10">
                    <Icon name="trash" size={16} strokeWidth={1.75} className="flex-none" />
                    {t("delete")}
                  </button>
                </MenuPopover>
              </div>
            )}
          </li>
        ))}
        {p.editable && p.photos.length < p.maxPhotos && (
          <li className="aspect-[4/3]">
            <label className={`flex size-full cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-field text-center hover:border-ink has-focus-visible:outline-3 has-focus-visible:outline-brand ${busy ? "cursor-progress opacity-70" : ""}`}>
              <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy} onChange={(e) => void upload(e.target.files)} className="sr-only" />
              <Icon name="upload" size={18} strokeWidth={1.9} className="text-brand" />
              <span className="text-[13.5px] font-semibold text-brand">{t(busy ? "uploading" : "upload")}</span>
              <span className="text-[11.5px] text-muted">{t("uploadSub")}</span>
            </label>
          </li>
        )}
      </ul>
      {!p.editable && p.photos.length === 0 && <p className="text-sm text-muted">{t("empty")}</p>}
    </Card>
  );
}

function Unit({ id, label, value, onChange, unit, error, optional, max = 11, disabled }: {
  id: string; label: string; value: string; onChange: (v: string) => void; unit: string; error?: string; optional?: string; max?: number; disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>
        {label} {optional && <Optional>{optional}</Optional>}
      </Label>
      <div className="relative">
        <input id={id} inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value)} maxLength={max} disabled={disabled}
          aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} className={`${INPUT_CLASS} pr-16 tabular-nums disabled:opacity-60`} />
        <span aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[13px] text-muted">{unit}</span>
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
  const set = <K extends keyof typeof v>(k: K) => (x: (typeof v)[K]) => setV((s) => ({ ...s, [k]: x }));
  const err = (k: string, min = 0, max = 0) => (f[k] === "range" ? e("range", { min, max }) : f[k] ? e(f[k] === "date" ? "date" : "amount") : undefined);
  const select = (key: "pets" | "smoking", label: string, options: CatalogOption[]) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`${id}-${key}`}>{label}</Label>
      <select id={`${id}-${key}`} value={v[key]} onChange={(ev) => set(key)(ev.target.value)} disabled={!p.editable} className={`${INPUT_CLASS} appearance-auto ${v[key] ? "" : "text-muted"}`}>
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
  const seg = "flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-md px-2 text-[13px] font-medium text-muted has-checked:bg-surface has-checked:text-ink has-checked:shadow-[0_1px_2px_rgb(12_31_25/0.12)] has-focus-visible:outline-3 has-focus-visible:outline-brand sm:min-h-10";
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
          <Unit id={`${id}-dep`} label={t("deposit")} value={v.depositMonths} onChange={set("depositMonths")} unit={t("depositUnit")} max={2} error={err("depositMonths", 0, 12)} />
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
              <input id={`${id}-from`} type="date" max="9999-12-31" value={v.availableFrom} onChange={(ev) => set("availableFrom")(ev.target.value)}
                aria-invalid={f.availableFrom ? true : undefined} className={INPUT_CLASS} />
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
                <select id={`${id}-park`} value={v.parkingPropertyId} onChange={(ev) => set("parkingPropertyId")(ev.target.value)} className={`${INPUT_CLASS} appearance-auto`}>
                  <option value="">{t("parkingNone")}</option>
                  {p.parkingOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
              {v.parkingPropertyId && <Unit id={`${id}-prent`} label={t("parkingRent")} value={v.parkingRent} onChange={set("parkingRent")} unit={t("perMonth")} error={err("parkingRent", 0, 99999999)} />}
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
        <button type="button" onClick={copy} disabled={!title.trim() && !text.trim()} className={`${buttonClass("secondary", true)} w-auto disabled:opacity-50`}>
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
            <textarea id={`${id}-text`} value={text} onChange={(ev) => setText(ev.target.value)} maxLength={3000} rows={6} aria-describedby={`${id}-count`}
              className={`${INPUT_CLASS} h-auto min-h-36 py-2.5 leading-[22px]`} />
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

function Links({ p }: { p: ListingProps }) {
  const t = useTranslations("properties.listing.links");
  const e = useTranslations("properties.listing.errors");
  const id = useId();
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [state, setState] = useState<ListingState>({ status: "idle" });
  const [pending, start] = useTransition();
  const f = state.status === "error" ? (state.fields ?? {}) : {};
  const add = (ev: React.FormEvent) => {
    ev.preventDefault();
    start(async () => {
      const r = await addLink(p.propertyId, label, url);
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
  return (
    <Card
      title={t("title")}
      action={
        p.editable &&
        !adding && (
          <button type="button" onClick={() => setAdding(true)} className="inline-flex min-h-11 items-center text-[13.5px] font-semibold text-brand hover:underline sm:min-h-6">
            {t("add")}
          </button>
        )
      }
    >
      {p.links.length === 0 && !adding && <p className="text-sm text-muted">{t("empty")}</p>}
      {p.links.length > 0 && (
        <ul className="flex flex-col">
          {p.links.map((l) => (
            <li key={l.id} className="flex items-center gap-3 border-t border-paper py-2.5 first:border-t-0 first:pt-0">
              <span aria-hidden="true" className="flex size-8 flex-none items-center justify-center rounded-lg bg-ink text-[13px] font-semibold text-lime uppercase">
                {l.label.slice(0, 1)}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-semibold [overflow-wrap:anywhere]">{l.label}</span>
                <span className="truncate text-[12.5px] text-muted">{l.host}</span>
              </span>
              <a href={l.url} target="_blank" rel="noopener noreferrer" aria-label={t("open", { name: l.label })}
                className="flex size-11 flex-none items-center justify-center rounded-lg text-brand hover:bg-paper sm:size-9">
                <Icon name="external" size={16} strokeWidth={1.8} />
              </a>
              {p.editable && (
                <button type="button" onClick={() => remove(l)} aria-label={t("remove", { name: l.label })}
                  className="flex size-11 flex-none items-center justify-center rounded-lg text-muted hover:bg-paper hover:text-danger-ink sm:size-9">
                  <Icon name="trash" size={15} strokeWidth={1.8} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {adding && (
        <form onSubmit={add} noValidate className="flex flex-col gap-3 rounded-lg bg-paper p-3.5">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-label`}>{t("label")}</Label>
              <input id={`${id}-label`} value={label} onChange={(ev) => setLabel(ev.target.value)} placeholder={t("labelPlaceholder")} maxLength={60}
                aria-invalid={f.label ? true : undefined} className={INPUT_CLASS} autoFocus />
              {f.label && <FieldError id={`${id}-label-error`} message={e("label")} />}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-url`}>{t("url")}</Label>
              <input id={`${id}-url`} type="url" inputMode="url" value={url} onChange={(ev) => setUrl(ev.target.value)} placeholder={t("urlPlaceholder")} maxLength={500}
                aria-invalid={f.url ? true : undefined} className={INPUT_CLASS} />
              {f.url && <FieldError id={`${id}-url-error`} message={e("url")} />}
            </div>
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
    </Card>
  );
}

/** "Fotók és hirdetés" (canvas "Ingatlan – fotók és hirdetés"): photos with a cover, rental terms, listing text and links. */
export function ListingPanel(p: ListingProps) {
  return (
    <div className="flex flex-col gap-4">
      <Photos p={p} />
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
