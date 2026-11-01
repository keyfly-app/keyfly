"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Notice } from "@/components/ui/form";
import { resetStaffMfa, type ResetState } from "./actions";

/** Super admin: reset a colleague's two-factor authentication, behind a confirmation dialog. */
export function ResetMfaButton({ userId, name }: { userId: string; name: string }) {
  const t = useTranslations("adminStaff.reset");
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [state, action, pending] = useActionState<ResetState, FormData>(resetStaffMfa, { status: "idle" });

  useEffect(() => {
    if (state.status === "done") {
      dialog.current?.close();
      router.refresh();
    }
  }, [state, router]);

  return (
    <>
      <button
        type="button"
        aria-label={t("openLabel", { name })}
        onClick={() => dialog.current?.showModal()}
        className="inline-flex h-11 items-center rounded-lg border border-field bg-surface px-2.5 text-[12.5px] font-medium whitespace-nowrap hover:border-ink sm:h-[30px]"
      >
        {t("open")}
      </button>
      {state.status === "done" && <Notice kind="success">{t("done")}</Notice>}
      <dialog
        ref={dialog}
        aria-labelledby={`${id}-title`}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-[14px] bg-surface p-6 text-ink shadow-[0_24px_64px_-16px_rgb(12_31_25/0.4)] backdrop:bg-ink/30"
      >
        <form action={action} className="flex flex-col gap-3.5">
          <input type="hidden" name="userId" value={userId} />
          <h2 id={`${id}-title`} className="font-display text-lg leading-6 font-semibold">
            {t("title", { name })}
          </h2>
          <p className="text-sm text-muted">{t("text")}</p>
          <Notice kind="warning">{t("warning")}</Notice>
          {state.status === "error" && <Notice kind="error">{t("error")}</Notice>}
          <div className="mt-1 flex flex-wrap justify-end gap-2.5">
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              className="inline-flex h-11 items-center rounded-lg border border-field bg-surface px-4 text-sm font-medium hover:border-ink sm:h-10"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              aria-disabled={pending || undefined}
              onClick={pending ? (e) => e.preventDefault() : undefined}
              className="inline-flex h-11 items-center rounded-lg bg-danger-ink px-4 text-sm font-medium text-white aria-disabled:opacity-70 sm:h-10"
            >
              {pending ? t("resetting") : t("confirm")}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
