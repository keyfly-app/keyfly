"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Icon, type IconName } from "@/components/Icon";
import { Dialog, DialogActions } from "@/components/ui/Dialog";
import { Button, Notice } from "@/components/ui/form";
import { cancelLeaseRequest, confirmLeaseRequest, remindLeaseRequest, type RequestState } from "./actions";

const idle: RequestState = { status: "idle" };

function ActionError({ state }: { state: RequestState }) {
  const t = useTranslations("leaseRequest");
  return state.status === "error" ? <Notice kind="error">{t(`errors.${state.error ?? "generic"}`)}</Notice> : null;
}

/**
 * Reminder to the landlord – also the "send a new invitation" of an expired one: the landlord gets a new link for 7 days.
 * `waitUntil`: the next reminder is only possible from then (one a day); the button says why it is unavailable.
 */
export function RemindButton({
  requestId,
  label,
  icon,
  primary = false,
  full = false,
  waitUntil,
}: {
  requestId: string;
  label: string;
  icon: IconName;
  primary?: boolean;
  full?: boolean;
  waitUntil?: string;
}) {
  const [state, action, pending] = useActionState(remindLeaseRequest, idle);
  const style = primary ? "bg-ink text-white shadow-[0_1px_2px_rgb(12_31_25/0.16)] hover:bg-ink-soft" : "border border-field bg-surface text-ink hover:border-ink";
  return (
    <form action={action} className={`flex flex-col gap-2 ${full ? "w-full" : ""}`}>
      <input type="hidden" name="requestId" value={requestId} />
      <ActionError state={state} />
      <button
        type="submit"
        aria-disabled={pending || Boolean(waitUntil) || undefined}
        aria-describedby={waitUntil ? `${requestId}-wait` : undefined}
        onClick={pending || waitUntil ? (e) => e.preventDefault() : undefined}
        className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium whitespace-nowrap transition-colors aria-disabled:cursor-not-allowed aria-disabled:opacity-60 motion-reduce:transition-none sm:h-10 ${style} ${full ? "w-full" : ""}`}
      >
        {pending ? <span aria-hidden="true" className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" /> : <Icon name={icon} size={16} strokeWidth={2} />}
        {label}
      </button>
      {waitUntil && (
        <p id={`${requestId}-wait`} className="sr-only">
          {waitUntil}
        </p>
      )}
    </form>
  );
}

/** Withdraw the invitation – destructive, so behind a confirm dialog. */
export function RevokeButton({ requestId, landlord, full = false }: { requestId: string; landlord: string; full?: boolean }) {
  const t = useTranslations("leaseRequest");
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(cancelLeaseRequest, idle);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-medium text-danger-ink hover:bg-danger-soft sm:h-10 ${full ? "w-full px-4" : "-ml-2 px-2"}`}
      >
        <Icon name="undo" size={16} strokeWidth={2} />
        {t("page.revoke")}
      </button>
      {open && (
        <Dialog open onClose={() => setOpen(false)} title={t("revoke.title")} description={t("revoke.text", { name: landlord })} closeLabel={t("flow.close")}>
          <form action={action} className="flex flex-col gap-4">
            <input type="hidden" name="requestId" value={requestId} />
            <ActionError state={state} />
            <DialogActions>
              <button type="button" data-autofocus onClick={() => setOpen(false)} className="inline-flex h-11 items-center justify-center rounded-lg border border-field px-4 text-sm font-medium hover:border-ink sm:h-10">
                {t("flow.cancel")}
              </button>
              <Button variant="danger" pending={pending} fit>
                {t("revoke.confirm")}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      )}
    </>
  );
}

/** The landlord changed the terms: accept them (the lease is recorded), or decline behind a confirm dialog. */
export function ReconfirmActions({ requestId, stacked = false }: { requestId: string; stacked?: boolean }) {
  const t = useTranslations("leaseRequest");
  const [open, setOpen] = useState(false);
  const [accepted, accept, accepting] = useActionState(confirmLeaseRequest, idle);
  const [declined, decline, declining] = useActionState(cancelLeaseRequest, idle);
  return (
    <div className="flex flex-col gap-2">
      <ActionError state={accepted} />
      <div className={stacked ? "flex flex-col gap-2" : "flex flex-row-reverse gap-2"}>
        <form action={accept} className={stacked ? "" : "flex"}>
          <input type="hidden" name="requestId" value={requestId} />
          <Button pending={accepting} fit={!stacked}>
            {!accepting && <Icon name="check" size={16} strokeWidth={2} />}
            {t("reconfirm.accept")}
          </Button>
        </form>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`inline-flex h-11 items-center justify-center rounded-lg border border-field bg-surface px-4 text-sm font-medium hover:border-ink sm:h-10 ${stacked ? "w-full" : ""}`}
        >
          {t("reconfirm.decline")}
        </button>
      </div>
      {open && (
        <Dialog open onClose={() => setOpen(false)} title={t("reconfirm.declineTitle")} description={t("reconfirm.declineText")} closeLabel={t("flow.close")}>
          <form action={decline} className="flex flex-col gap-4">
            <input type="hidden" name="requestId" value={requestId} />
            <ActionError state={declined} />
            <DialogActions>
              <button type="button" data-autofocus onClick={() => setOpen(false)} className="inline-flex h-11 items-center justify-center rounded-lg border border-field px-4 text-sm font-medium hover:border-ink sm:h-10">
                {t("flow.cancel")}
              </button>
              <Button variant="danger" pending={declining} fit>
                {t("reconfirm.decline")}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      )}
    </div>
  );
}
