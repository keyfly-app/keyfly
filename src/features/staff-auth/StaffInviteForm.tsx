"use client";

import { useActionState, useId } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/Icon";
import { Button, Notice, TextField } from "@/components/ui/form";
import { inviteStaffMember, type StaffInviteState } from "./actions";

const ROLES = ["admin", "insurance", "finance", "support"] as const;

/** Super admin: invite a colleague (@keyfly.app only). Two-factor sign-in is required for every staff member. */
export function StaffInviteForm() {
  const t = useTranslations("adminStaff.invite");
  const roles = useTranslations("adminStaff.roles");
  const id = useId();
  const [state, action, pending] = useActionState<StaffInviteState, FormData>(inviteStaffMember, { status: "idle" });
  const error = state.status === "error" ? state.error : null;

  return (
    <section aria-labelledby={`${id}-title`} className="flex w-full flex-col gap-4 rounded-3xl bg-white p-6 lg:w-[380px] lg:flex-none">
      <h2 id={`${id}-title`} className="font-display text-lg font-semibold">
        {t("title")}
      </h2>
      {state.status === "sent" && (
        <Notice kind={state.emailSent ? "success" : "warning"} icon={state.emailSent ? "mail" : "alert"}>
          {state.emailSent ? t("sent", { email: state.email }) : t("createdNoEmail", { email: state.email })}
        </Notice>
      )}
      <form action={action} className="flex flex-col gap-4" key={state.status === "sent" ? state.email : "form"}>
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
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-[13px] font-semibold">{t("role")}</legend>
          {ROLES.map((role) => (
            <label
              key={role}
              className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-field px-3.5 py-3 has-[:checked]:border-brand has-[:checked]:bg-brand/5"
            >
              <input
                type="radio"
                name="role"
                value={role}
                defaultChecked={role === "support"}
                className="mt-0.5 size-5 flex-none accent-brand"
              />
              <span className="flex flex-col">
                <span className="text-[15px] font-semibold">{roles(role)}</span>
                <span className="text-[13px] text-muted">{t(`roleHints.${role}`)}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <p className="flex items-center gap-2 rounded-xl bg-brand/5 px-3.5 py-3 text-[13px] font-semibold text-brand">
          <Icon name="shield" size={16} strokeWidth={2.2} />
          {t("twoFactor")}
        </p>
        {error && error !== "email" && <Notice kind="error">{t(`errors.${error}`)}</Notice>}
        <Button pending={pending}>{pending ? t("sending") : t("submit")}</Button>
        <p className="text-center text-[13px] text-muted">{t("validity")}</p>
      </form>
    </section>
  );
}
