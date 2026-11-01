"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button, Notice } from "@/components/ui/form";
import { cancelLeaseRequest, confirmLeaseRequest, remindLeaseRequest, type RequestState } from "./actions";

const idle: RequestState = { status: "idle" };

/** Step 4: while waiting for the landlord – send a reminder or withdraw the invitation. */
export function WaitingActions({ requestId, canRemind }: { requestId: string; canRemind: boolean }) {
  const t = useTranslations("leaseRequest");
  const [reminded, remind, reminding] = useActionState(remindLeaseRequest, idle);
  const [cancelled, cancel, cancelling] = useActionState(cancelLeaseRequest, idle);
  const result = reminded.status !== "idle" ? reminded : cancelled;
  return (
    <div className="flex flex-col gap-3">
      {result.status === "error" && <Notice kind="error">{t(`errors.${result.error ?? "generic"}`)}</Notice>}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {canRemind && (
          <form action={remind}>
            <input type="hidden" name="requestId" value={requestId} />
            <button
              type="submit"
              aria-disabled={reminding || undefined}
              onClick={reminding ? (e) => e.preventDefault() : undefined}
              className="inline-flex h-11 items-center rounded-lg border border-field bg-surface px-4 text-sm font-medium hover:border-ink aria-disabled:opacity-70"
            >
              {t("waiting.remind")}
            </button>
          </form>
        )}
        <form action={cancel}>
          <input type="hidden" name="requestId" value={requestId} />
          <button
            type="submit"
            aria-disabled={cancelling || undefined}
            onClick={cancelling ? (e) => e.preventDefault() : undefined}
            className="inline-flex min-h-11 items-center text-sm font-semibold whitespace-nowrap text-brand underline-offset-3 hover:underline aria-disabled:opacity-70"
          >
            {t("waiting.cancel")}
          </button>
        </form>
      </div>
    </div>
  );
}

/** Step 7: accept the landlord's changed terms, or decline (the lease is not created). */
export function ReconfirmActions({ requestId }: { requestId: string }) {
  const t = useTranslations("leaseRequest");
  const [confirmed, confirm, confirming] = useActionState(confirmLeaseRequest, idle);
  const [declined, decline, declining] = useActionState(cancelLeaseRequest, idle);
  const result = confirmed.status === "error" ? confirmed : declined;
  return (
    <form className="mt-auto flex flex-col gap-2.5 pt-4">
      <input type="hidden" name="requestId" value={requestId} />
      {result.status === "error" && <Notice kind="error">{t(`errors.${result.error ?? "generic"}`)}</Notice>}
      <Button formAction={confirm} pending={confirming || declining}>
        {t("reconfirm.accept")}
      </Button>
      <Button formAction={decline} variant="secondary" pending={confirming || declining}>
        {t("reconfirm.decline")}
      </Button>
      <p className="text-center text-[13px] text-muted">{t("reconfirm.declineNote")}</p>
    </form>
  );
}
