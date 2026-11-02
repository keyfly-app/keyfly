"use client";

import { useActionState, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/Icon";
import { toast } from "@/components/Toaster";
import { Dialog, DialogActions } from "@/components/ui/Dialog";
import { Button, Notice, TextField } from "@/components/ui/form";
import type { Enums } from "@/lib/supabase/database.types";
import { decideRequest, inviteMember, manageInvitation, removeMember, type TeamState } from "./actions";

const idle: TeamState = { status: "idle" };
type Role = "manager" | "viewer" | "admin";
const ROLE_ORDER: Role[] = ["manager", "viewer", "admin"];

const SECONDARY = "inline-flex h-11 items-center justify-center rounded-lg border border-field bg-surface px-4 text-sm font-medium hover:border-ink sm:h-10";

/** Role as selectable cards, and the access switch (selected properties: Enterprise only). */
function RoleAndAccess({ enterprise }: { enterprise: boolean }) {
  const t = useTranslations("companies.team");
  const roles = useTranslations("invite.roles");
  const [role, setRole] = useState<Role>("manager");
  const hintId = useId();
  return (
    <>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-[13px] font-medium">{t("role")}</legend>
        {ROLE_ORDER.map((r) => (
          <label
            key={r}
            className={`flex cursor-pointer items-center gap-3 rounded-[10px] border px-3.5 py-3 has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand ${role === r ? "border-[1.5px] border-ink bg-paper" : "border-field"}`}
          >
            <span className="flex flex-1 flex-col">
              <span className="text-sm font-semibold">{roles(r)}</span>
              <span className="text-[13px] text-muted">{t(`roleText.${r}`)}</span>
            </span>
            <input type="radio" name="role" value={r} checked={role === r} onChange={() => setRole(r)} className="size-[18px] flex-none accent-ink" />
          </label>
        ))}
      </fieldset>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-[13px] font-medium">{t("access")}</legend>
        <div className="flex rounded-lg bg-paper p-0.5">
          <label className="flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-md bg-surface px-2 text-center text-[13px] font-medium shadow-[0_1px_2px_rgb(12_31_25/0.12)] has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand sm:min-h-9">
            <input type="radio" name="scope" value="all" defaultChecked className="sr-only" />
            {t("accessAll")}
          </label>
          <label className="flex min-h-11 flex-1 cursor-not-allowed items-center justify-center rounded-md px-2 text-center text-[13px] font-medium text-muted sm:min-h-9">
            <input type="radio" name="scope" value="selected" disabled aria-describedby={hintId} className="sr-only" />
            {t("accessSelected")}
          </label>
        </div>
        <p id={hintId} className="text-[12.5px] leading-[18px] text-muted">
          {t(enterprise ? "selectedSoon" : "selectedEnterprise")}
        </p>
      </fieldset>
    </>
  );
}

function errorText(t: ReturnType<typeof useTranslations>, state: TeamState) {
  return state.status === "error" ? t(`errors.${state.error}`) : null;
}

export function InviteMember({ accountId, enterprise }: { accountId: string; enterprise: boolean }) {
  const t = useTranslations("companies.team");
  const c = useTranslations("companies");
  const id = useId();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<TeamState, FormData>(async (prev, form) => {
    const next = await inviteMember(prev, form);
    if (next.status === "done") {
      setOpen(false);
      toast(t(next.message, { email: next.value ?? "" }), next.message === "invited" ? "ok" : "error");
    }
    return next;
  }, idle);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-medium text-white shadow-[0_1px_2px_rgb(12_31_25/0.16)] hover:bg-ink-soft sm:h-10 sm:w-auto">
        <Icon name="plus" size={16} strokeWidth={2} />
        {t("invite")}
      </button>
      {open && (
        <Dialog open onClose={() => setOpen(false)} title={t("inviteTitle")} description={t("inviteLead")} closeLabel={c("close")} wide>
          <form action={action} className="flex flex-col gap-4">
            <input type="hidden" name="accountId" value={accountId} />
            <TextField id={`${id}-email`} name="email" type="email" inputMode="email" autoComplete="off" label={t("email")} maxLength={254}
              error={state.status === "error" && state.error === "email" ? t("errors.email") : undefined} />
            <RoleAndAccess enterprise={enterprise} />
            <Notice kind="info" icon="info">
              {t("unlimited")}
            </Notice>
            {state.status === "error" && state.error !== "email" && <Notice kind="error">{errorText(t, state)}</Notice>}
            <DialogActions>
              <button type="button" onClick={() => setOpen(false)} className={SECONDARY}>
                {c("cancel")}
              </button>
              <Button pending={pending} fit>
                {!pending && <Icon name="send" size={16} strokeWidth={2} />}
                {t("send")}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      )}
    </>
  );
}

/** Approve (role, access) or decline an access request. */
export function RequestActions({ requestId, name, enterprise }: { requestId: string; name: string; enterprise: boolean }) {
  const t = useTranslations("companies.team");
  const c = useTranslations("companies");
  const [dialog, setDialog] = useState<"approve" | "decline" | null>(null);
  const [state, action, pending] = useActionState<TeamState, FormData>(async (prev, form) => {
    const next = await decideRequest(prev, form);
    if (next.status === "done") {
      setDialog(null);
      toast(next.message === "approved" ? t("approved", { name }) : t("declined"));
    }
    return next;
  }, idle);
  return (
    <div className="flex flex-none gap-2">
      <button type="button" onClick={() => setDialog("decline")} className="inline-flex h-11 items-center rounded-lg px-3 text-sm font-medium hover:bg-paper sm:h-10">
        {t("decline")}
      </button>
      <button type="button" onClick={() => setDialog("approve")} className={SECONDARY}>
        {t("approve")}
      </button>
      {dialog === "approve" && (
        <Dialog open onClose={() => setDialog(null)} title={t("approveTitle", { name })} description={t("approveLead")} closeLabel={c("close")} wide>
          <form action={action} className="flex flex-col gap-4">
            <input type="hidden" name="requestId" value={requestId} />
            <input type="hidden" name="decision" value="approve" />
            <RoleAndAccess enterprise={enterprise} />
            <Notice kind="info" icon="info">
              {t("unlimited")}
            </Notice>
            {state.status === "error" && <Notice kind="error">{errorText(t, state)}</Notice>}
            <DialogActions>
              <button type="button" onClick={() => setDialog(null)} className={SECONDARY}>
                {c("cancel")}
              </button>
              <Button pending={pending} fit>
                {!pending && <Icon name="check" size={16} strokeWidth={2} />}
                {t("approve")}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      )}
      {dialog === "decline" && (
        <Dialog open onClose={() => setDialog(null)} title={t("declineTitle")} description={t("declineText", { name })} closeLabel={c("close")}>
          <form action={action} className="flex flex-col gap-4">
            <input type="hidden" name="requestId" value={requestId} />
            <input type="hidden" name="decision" value="decline" />
            {state.status === "error" && <Notice kind="error">{errorText(t, state)}</Notice>}
            <DialogActions>
              <button type="button" data-autofocus onClick={() => setDialog(null)} className={SECONDARY}>
                {c("cancel")}
              </button>
              <Button variant="danger" pending={pending} fit>
                {t("decline")}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      )}
    </div>
  );
}

/** Pending invitation: send again, or withdraw (behind a confirm dialog). */
export function InvitationActions({ invitationId, email }: { invitationId: string; email: string }) {
  const t = useTranslations("companies.team");
  const c = useTranslations("companies");
  const [confirm, setConfirm] = useState(false);
  const [state, action, pending] = useActionState<TeamState, FormData>(async (prev, form) => {
    const next = await manageInvitation(prev, form);
    if (next.status === "done") {
      setConfirm(false);
      toast(next.message === "resent" ? t("resent", { email }) : t("withdrawn"));
    } else if (next.status === "error") toast(t(`errors.${next.error}`), "error");
    return next;
  }, idle);
  return (
    <div className="-ml-3 flex flex-none items-center gap-1 sm:ml-0">
      <form action={action}>
        <input type="hidden" name="invitationId" value={invitationId} />
        <input type="hidden" name="intent" value="resend" />
        <button type="submit" aria-disabled={pending || undefined} className="inline-flex h-11 items-center rounded-lg px-3 text-sm font-medium hover:bg-paper aria-disabled:opacity-60 sm:h-9">
          {t("resend")}
        </button>
      </form>
      <button type="button" onClick={() => setConfirm(true)} className="inline-flex h-11 items-center rounded-lg px-3 text-sm font-medium text-danger-ink hover:bg-danger-soft sm:h-9">
        {t("withdraw")}
      </button>
      {confirm && (
        <Dialog open onClose={() => setConfirm(false)} title={t("withdraw")} description={email} closeLabel={c("close")}>
          <form action={action} className="flex flex-col gap-4">
            <input type="hidden" name="invitationId" value={invitationId} />
            <input type="hidden" name="intent" value="withdraw" />
            {state.status === "error" && <Notice kind="error">{errorText(t, state)}</Notice>}
            <DialogActions>
              <button type="button" data-autofocus onClick={() => setConfirm(false)} className={SECONDARY}>
                {c("cancel")}
              </button>
              <Button variant="danger" pending={pending} fit>
                {t("withdraw")}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      )}
    </div>
  );
}

export function RemoveMember({ accountId, userId, name }: { accountId: string; userId: string; name: string }) {
  const t = useTranslations("companies.team");
  const c = useTranslations("companies");
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<TeamState, FormData>(async (prev, form) => {
    const next = await removeMember(prev, form);
    if (next.status === "done") setOpen(false);
    return next;
  }, idle);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("memberActions", { name })}
        title={t("remove")}
        className="flex size-11 items-center justify-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger-ink sm:size-9"
      >
        <Icon name="x" size={16} strokeWidth={2} />
      </button>
      {open && (
        <Dialog open onClose={() => setOpen(false)} title={t("removeTitle")} description={t("removeText", { name })} closeLabel={c("close")}>
          <form action={action} className="flex flex-col gap-4">
            <input type="hidden" name="accountId" value={accountId} />
            <input type="hidden" name="userId" value={userId} />
            {state.status === "error" && <Notice kind="error">{errorText(t, state)}</Notice>}
            <DialogActions>
              <button type="button" data-autofocus onClick={() => setOpen(false)} className={SECONDARY}>
                {c("cancel")}
              </button>
              <Button variant="danger" pending={pending} fit>
                {t("removeConfirm")}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      )}
    </>
  );
}

export type MemberRole = Enums<"account_role">;
