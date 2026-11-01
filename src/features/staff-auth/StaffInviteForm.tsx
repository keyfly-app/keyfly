"use client";

import { useActionState, useId, useRef } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/Icon";
import { Button, Notice, TextField } from "@/components/ui/form";
import { inviteStaffMember, type StaffInviteState } from "./actions";

const ROLES = ["admin", "insurance", "finance", "support"] as const;

/** Super admin: "Invite a colleague" button and dialog (@keyfly.app only; two-step verification is always required). */
export function StaffInviteForm() {
  const t = useTranslations("adminStaff.invite");
  const roles = useTranslations("adminStaff.roles");
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState<StaffInviteState, FormData>(inviteStaffMember, { status: "idle" });
  const error = state.status === "error" ? state.error : null;

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-ink px-3.5 text-[13px] font-medium whitespace-nowrap text-white shadow-[0_1px_2px_rgb(12_31_25/0.16)] hover:bg-ink-soft sm:h-[34px]"
      >
        <Icon name="mail" size={15} />
        {t("title")}
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={`${id}-title`}
        className="m-auto w-[calc(100%-2rem)] max-w-[440px] rounded-[14px] bg-surface p-6 text-ink shadow-[0_24px_64px_-16px_rgb(12_31_25/0.4)] backdrop:bg-ink/30"
      >
        <div className="flex flex-col gap-4.5">
          <div className="flex flex-col gap-1">
            <h2 id={`${id}-title`} className="font-display text-lg leading-6 font-semibold">
              {t("title")}
            </h2>
            <p className="text-[13px] text-muted">{t("sub")}</p>
          </div>
          {state.status === "sent" && (
            <Notice kind={state.emailSent ? "success" : "warning"} icon={state.emailSent ? "mail" : "alert"}>
              {state.emailSent ? t("sent", { email: state.email }) : t("createdNoEmail", { email: state.email })}
            </Notice>
          )}
          <form action={action} className="flex flex-col gap-4.5" key={state.status === "sent" ? state.email : "form"}>
            <TextField
              id={`${id}-email`}
              name="email"
              type="email"
              autoComplete="off"
              required
              label={t("email")}
              placeholder={t("emailPlaceholder")}
              defaultValue={state.status === "error" ? state.email : undefined}
              error={error === "email" ? t("errors.email") : undefined}
            />
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1.5 text-[13px] font-medium">{t("role")}</legend>
              {ROLES.map((role) => (
                <label
                  key={role}
                  className="flex min-h-11 cursor-pointer items-start gap-2.5 rounded-lg border border-line px-3 py-2.5 has-[:checked]:border-ink has-[:checked]:bg-paper"
                >
                  <input type="radio" name="role" value={role} defaultChecked={role === "support"} className="mt-0.5 size-3.5 flex-none accent-ink" />
                  <span className="flex flex-col leading-[18px]">
                    <span className="text-[13.5px] font-medium">{roles(role)}</span>
                    <span className="text-[12.5px] text-muted">{t(`roleHints.${role}`)}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            <p className="flex items-center gap-1.5 text-[12.5px] text-muted">
              <Icon name="shield" size={14} />
              {t("twoFactor")}
            </p>
            {error && error !== "email" && <Notice kind="error">{t(`errors.${error}`)}</Notice>}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => dialog.current?.close()}
                className="inline-flex h-11 items-center justify-center rounded-lg border border-field bg-surface px-4 text-sm font-medium hover:border-ink sm:h-10"
              >
                {t("cancel")}
              </button>
              <div className="sm:w-auto">
                <Button pending={pending}>{pending ? t("sending") : t("submit")}</Button>
              </div>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}
