"use client";

import { startTransition, useActionState, useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/Icon";
import { CompanyMark } from "@/components/ui/CompanyMark";
import { ImageCropDialog, type PickedImage } from "@/components/ui/ImageCropDialog";
import { Notice } from "@/components/ui/form";
import { removeCompanyLogo, uploadCompanyLogo, type LogoState } from "./logo-actions";

const MAX_FILE = 5 * 1024 * 1024;
const MIN_SIDE = 256;
const TYPES = ["image/png", "image/jpeg", "image/webp"];
const IDLE: LogoState = { status: "idle" };

/**
 * Cégadatok → Logó (canvas v2.5 "Céglogó – Cégadatok", "… igazítás"): the holder or an admin picks an image, fits it
 * into the square and the browser saves 512 × 512; the logo then replaces the monogram everywhere.
 */
export function LogoEditor({ accountId, logoUrl, initials }: { accountId: string; logoUrl: string | null; initials: string }) {
  const t = useTranslations("companies.logo");
  const d = useTranslations("settings.dialogs");
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<PickedImage | null>(null);
  const [localError, setLocalError] = useState<"type" | "size" | "small" | null>(null);
  const [uploaded, upload, uploading] = useActionState(async (prev: LogoState, form: FormData) => {
    const next = await uploadCompanyLogo(prev, form);
    if (next.status === "saved") setPicked(null);
    return next;
  }, IDLE);
  const [removed, remove, removing] = useActionState(removeCompanyLogo, IDLE);
  const [last, setLast] = useState<"upload" | "remove" | null>(null);
  const result = last === "upload" ? uploaded : last === "remove" ? removed : IDLE;

  useEffect(() => () => void (picked && URL.revokeObjectURL(picked.url)), [picked]);

  const onFile = (file: File | undefined) => {
    setLocalError(null);
    if (!file) return;
    if (!TYPES.includes(file.type)) return setLocalError("type");
    if (file.size > MAX_FILE) return setLocalError("size");
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (Math.max(img.naturalWidth, img.naturalHeight) < MIN_SIDE) {
        URL.revokeObjectURL(url);
        return setLocalError("small");
      }
      setPicked({ url, width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setLocalError("type");
    };
    img.src = url;
  };

  const message = localError
    ? { kind: "error" as const, text: t(`errors.${localError}`) }
    : result.status === "error"
      ? { kind: "error" as const, text: t(`errors.${result.error}`) }
      : result.status === "saved" || result.status === "removed"
        ? { kind: "success" as const, text: t(result.status) }
        : null;

  return (
    <section aria-labelledby={`${id}-title`} className="rounded-xl border border-line bg-surface">
      <h2 id={`${id}-title`} className="px-5 pt-5 text-[15px] font-semibold sm:px-6">
        {t("title")}
      </h2>
      <div className="flex flex-col gap-4 px-5 pt-3.5 pb-5 sm:px-6">
        <div className="flex items-center gap-4 sm:gap-5">
          <CompanyMark logoUrl={logoUrl} initials={initials} size={72} />
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => input.current?.click()}
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-field bg-surface px-3.5 text-[13px] font-medium hover:border-ink sm:h-9"
              >
                <Icon name="upload" size={16} />
                {logoUrl ? t("replace") : t("upload")}
              </button>
              {logoUrl && (
                <form action={remove} onSubmit={() => setLast("remove")}>
                  <input type="hidden" name="account" value={accountId} />
                  <button
                    type="submit"
                    disabled={removing}
                    className="inline-flex h-11 items-center rounded-lg px-3 text-[13px] font-medium text-muted hover:text-ink sm:h-9"
                  >
                    {t("remove")}
                  </button>
                </form>
              )}
            </div>
            <p className="text-[12.5px] leading-[18px] text-muted">{t("hint")}</p>
          </div>
        </div>
        <input
          ref={input}
          type="file"
          accept={TYPES.join(",")}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        {message && <Notice kind={message.kind}>{message.text}</Notice>}
      </div>
      {picked && (
        <ImageCropDialog
          picked={picked}
          kind="logo"
          pending={uploading}
          labels={{
            title: t("cropTitle"),
            lead: t("cropLead"),
            alt: t("cropAlt"),
            zoom: d("zoom"),
            cancel: d("cancel"),
            save: d("save"),
            close: d("close"),
          }}
          onClose={() => setPicked(null)}
          onSave={(blob) => {
            const form = new FormData();
            form.set("account", accountId);
            form.set("logo", blob, blob.type === "image/webp" ? "logo.webp" : "logo.png");
            setLast("upload");
            startTransition(() => upload(form));
          }}
        />
      )}
    </section>
  );
}
