"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { ImageCropDialog, type PickedImage } from "@/components/ui/ImageCropDialog";
import { Notice } from "@/components/ui/form";
import { removePhoto, uploadPhoto, type SettingsState } from "./actions";

const MAX_FILE = 10 * 1024 * 1024;
const IDLE: SettingsState = { status: "idle" };

/**
 * Profile photo (canvas "Profilkép kivágása"): pick a file, drag and zoom it inside a circle, and the browser
 * saves a 512 × 512 square – no original photo ever leaves the device.
 */
export function PhotoEditor({ avatarUrl, initials }: { avatarUrl: string | null; initials: string }) {
  const t = useTranslations("settings");
  const d = useTranslations("settings.dialogs");
  const input = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<PickedImage | null>(null);
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
        <ImageCropDialog
          picked={picked}
          kind="photo"
          pending={uploading}
          labels={{ title: d("cropTitle"), lead: d("cropLead"), alt: d("cropAlt"), zoom: d("zoom"), cancel: d("cancel"), save: d("cropSave"), close: d("close") }}
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
