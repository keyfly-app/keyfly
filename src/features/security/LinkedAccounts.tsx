"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "@/components/Toaster";
import { Dialog, DialogActions } from "@/components/ui/Dialog";
import { Button, Notice } from "@/components/ui/form";
import { GoogleMark } from "@/features/auth/GoogleButton";
import { PasswordField } from "@/features/auth/PasswordField";
import { linkGoogle, unlinkGoogle, type GoogleState } from "./google-actions";

const SECONDARY = "inline-flex h-11 flex-none items-center justify-center rounded-lg border border-field bg-surface px-3.5 text-[13px] font-medium hover:border-ink sm:h-9";

/**
 * Kapcsolt fiókok (canvas v2.4 "Bejelentkezés és biztonság – Google-fiók"): link a Google account, unlink it (behind
 * a confirm dialog; first a password if Google is the only way in), link another one later.
 */
export function LinkedAccounts({ google, hasPassword, notice }: { google: { email: string; since: string } | null; hasPassword: boolean; notice: "linked" | "taken" | "error" | null }) {
  const t = useTranslations("security.google");
  const c = useTranslations("companies");
  const id = useId();
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const [state, action, pending] = useActionState<GoogleState, FormData>(unlinkGoogle, { status: "idle" });
  useEffect(() => {
    if (state.status === "done") toast(t("unlinked"));
  }, [state, t]);
  useEffect(() => {
    if (notice === "linked") toast(t("linked"));
  }, [notice, t]);
  const close = () => {
    setOpen(false);
    requestAnimationFrame(() => opener.current?.focus());
  };
  const shown = state.status === "done" ? null : google;
  const error = state.status === "error" ? state.error : null;

  return (
    <section aria-labelledby={`${id}-title`} className="rounded-xl border border-line bg-surface">
      <h2 id={`${id}-title`} className="px-5 pt-5 pb-3 text-[15px] font-semibold sm:px-6">
        {t("title")}
      </h2>
      {(notice === "taken" || notice === "error") && (
        <div className="px-5 pb-3 sm:px-6">
          <Notice kind="error">{t(notice === "taken" ? "taken" : "error")}</Notice>
        </div>
      )}
      <div className="flex items-center gap-3 border-t border-line px-5 py-3.5 sm:px-6">
        <span aria-hidden="true" className="hidden size-9 flex-none items-center justify-center rounded-[10px] border border-line bg-surface sm:flex">
          <GoogleMark />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-[12.5px] text-muted">Google</span>
          <span className="truncate text-sm font-medium">{shown ? shown.email : t("off")}</span>
          <span className="text-[12.5px] text-muted">{shown ? t("since", { date: shown.since }) : t("offText")}</span>
        </div>
        {shown ? (
          <button ref={opener} type="button" onClick={() => setOpen(true)} className={SECONDARY}>
            {t("unlink")}
          </button>
        ) : (
          <form action={linkGoogle}>
            <button type="submit" className={SECONDARY}>
              {t("link")}
            </button>
          </form>
        )}
      </div>

      {open && state.status !== "done" && (
        <Dialog
          open
          onClose={close}
          title={hasPassword ? t("unlinkTitle") : t("passwordTitle")}
          description={hasPassword ? t("unlinkText") : t("passwordText")}
          closeLabel={c("close")}
        >
          <form action={action} className="flex flex-col gap-4">
            {!hasPassword && (
              <PasswordField id={`${id}-pw`} label={t("newPassword")} autoComplete="new-password" rules error={error === "weakPassword" ? t("weakPassword") : undefined} />
            )}
            {error && error !== "weakPassword" && <Notice kind="error">{t(error === "single" ? "single" : "failed")}</Notice>}
            <DialogActions>
              <button type="button" onClick={close} className="inline-flex h-11 items-center justify-center rounded-lg border border-field px-4 text-sm font-medium hover:border-ink sm:h-10">
                {c("cancel")}
              </button>
              <Button pending={pending} fit>
                {hasPassword ? t("unlink") : t("passwordUnlink")}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      )}
    </section>
  );
}
