"use client";

import { useActionState, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { CodeInput } from "@/components/ui/CodeInput";
import { Dialog, DialogActions } from "@/components/ui/Dialog";
import { Button, Notice } from "@/components/ui/form";
import { PasswordField } from "@/features/auth/PasswordField";
import { deleteAccount, type DeleteState } from "./actions";

/** Fiók törlése (canvas "Fiók törlése – megerősítés"): password, and the two-step code when it is on. */
export function DeleteAccount({ twoStep, blocked }: { twoStep: boolean; blocked: boolean }) {
  const t = useTranslations("settings.data");
  const id = useId();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<DeleteState, FormData>(deleteAccount, { status: "idle" });
  const error = state.status === "error" ? state.error : null;
  return (
    <>
      <button
        type="button"
        onClick={() => !blocked && setOpen(true)}
        aria-disabled={blocked || undefined}
        className="inline-flex h-11 flex-none items-center justify-center rounded-lg border border-field bg-surface px-4 text-sm font-medium text-danger-ink hover:border-danger-ink aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:border-field sm:h-10"
      >
        {t("delete")}
      </button>
      {open && (
        <Dialog open onClose={() => setOpen(false)} title={t("confirmTitle")} description={t("confirmText")} closeLabel={t("close")}>
          <form action={action} className="flex flex-col gap-5">
            <PasswordField id={`${id}-password`} label={t("password")} autoComplete="current-password" error={error === "password" ? t("errors.password") : undefined} />
            {twoStep && <CodeInput id={`${id}-code`} name="code" label={t("code")} fill error={error === "code" ? t("errors.code") : undefined} />}
            {error && error !== "password" && error !== "code" && <Notice kind="error">{t(`errors.${error}`)}</Notice>}
            <DialogActions>
              <button type="button" data-autofocus onClick={() => setOpen(false)} className="inline-flex h-11 items-center justify-center rounded-lg border border-field px-4 text-sm font-medium hover:border-ink sm:h-10">
                {t("cancel")}
              </button>
              <Button variant="danger" pending={pending} fit>
                {t("confirm")}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      )}
    </>
  );
}
