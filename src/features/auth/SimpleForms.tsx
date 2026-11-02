"use client";

import { useActionState, useId } from "react";
import { useTranslations } from "next-intl";
import { Button, Notice, TextField } from "@/components/ui/form";
import { Turnstile } from "@/features/bot-check/Turnstile";
import type { AppSite } from "@/lib/sites";
import { requestPasswordReset, resendConfirmation, updatePassword, type FormState } from "./actions";
import { PasswordField } from "./PasswordField";

const idle: FormState = { status: "idle" };

export function ResendConfirmationForm() {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState(resendConfirmation, idle);
  return (
    <form action={action} className="flex flex-col gap-3">
      {state.status === "sent" && <Notice kind="success">{t("verify.resent")}</Notice>}
      {state.status === "error" && <Notice kind="error">{t(`errors.${state.error === "rateLimit" ? "rateLimit" : "generic"}`)}</Notice>}
      <Button variant="secondary" pending={pending}>
        {pending ? t("sending") : t("verify.resend")}
      </Button>
    </form>
  );
}

/** Password-reset request; `site` decides where the emailed link lands (customer app or admin). */
export function ForgotPasswordForm({ site = "portal" }: { site?: AppSite }) {
  const t = useTranslations("auth");
  const id = useId();
  const [state, action, pending] = useActionState(requestPasswordReset, idle);
  if (state.status === "sent") {
    return (
      <Notice kind="success" icon="mail">
        <p>{t("forgot.sentTitle")}</p>
        <p className="mt-0.5 font-normal text-ink-soft">{t("forgot.sentText")}</p>
      </Notice>
    );
  }
  const error = state.status === "error" ? state.error : undefined;
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="site" value={site} />
      <TextField
        id={`${id}-email`}
        name="email"
        type="email"
        label={t("email")}
        autoComplete="email"
        defaultValue={state.status === "error" ? state.email : undefined}
        error={error === "email" ? t("errors.email") : undefined}
      />
      {(error === "rateLimit" || error === "captcha") && <Notice kind="error">{t(`errors.${error}`)}</Notice>}
      <Turnstile resetKey={state} />
      <Button pending={pending}>{pending ? t("sending") : t("forgot.submit")}</Button>
    </form>
  );
}

export function NewPasswordForm({ site = "portal" }: { site?: AppSite }) {
  const t = useTranslations("auth");
  const id = useId();
  const [state, action, pending] = useActionState(updatePassword, idle);
  const error = state.status === "error" ? state.error : undefined;
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="site" value={site} />
      <PasswordField
        id={`${id}-password`}
        label={t("reset.password")}
        autoComplete="new-password"
        rules
        error={error === "password" ? t("errors.password") : undefined}
      />
      {(error === "samePassword" || error === "generic") && <Notice kind="error">{t(`errors.${error}`)}</Notice>}
      {error === "resetExpired" && <Notice kind="warning">{t("linkExpired")}</Notice>}
      <Button pending={pending}>{pending ? t("reset.submitting") : t("reset.submit")}</Button>
    </form>
  );
}
