"use client";

import { useActionState, useId } from "react";
import { useTranslations } from "next-intl";
import { Button, Checkbox, Divider, Notice, TextField, TextLink } from "@/components/ui/form";
import { AUTH_METHODS } from "@/config/auth";
import { sendEmailLink, signIn, type FormState } from "./actions";
import { PasswordField } from "./PasswordField";

/**
 * Email + password sign-in. The same email field also sends a one-time sign-in link
 * (second button), so nobody has to type their address twice.
 */
export function SignInForm({ next, forgotHref }: { next: string; forgotHref: string }) {
  const t = useTranslations("auth");
  const id = useId();
  const [state, passwordAction, signingIn] = useActionState<FormState, FormData>(signIn, { status: "idle" });
  const [linkState, linkAction, sending] = useActionState<FormState, FormData>(sendEmailLink, { status: "idle" });

  if (linkState.status === "sent") {
    return (
      <Notice kind="success" icon="mail">
        <p>{t("emailLink.sentTitle")}</p>
        <p className="mt-0.5 font-normal text-ink-soft">{t("emailLink.sentText")}</p>
      </Notice>
    );
  }

  const error = state.status === "error" ? state.error : linkState.status === "error" ? linkState.error : undefined;
  const email = state.status === "error" ? state.email : linkState.status === "error" ? linkState.email : undefined;

  return (
    <form action={passwordAction} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="site" value="portal" />
      <TextField
        id={`${id}-email`}
        name="email"
        type="email"
        label={t("email")}
        autoComplete="email"
        defaultValue={email}
        error={error === "email" ? t("errors.email") : undefined}
      />
      <PasswordField
        id={`${id}-password`}
        label={t("password")}
        autoComplete="current-password"
        error={error === "password" ? t("errors.passwordMissing") : undefined}
      />
      <div className="flex flex-wrap items-center justify-between gap-x-4">
        <Checkbox id={`${id}-remember`} name="remember">
          {t("signIn.remember")}
        </Checkbox>
        <TextLink href={forgotHref}>{t("signIn.forgot")}</TextLink>
      </div>
      {error && error !== "email" && error !== "password" && <Notice kind="error">{t(`errors.${error}`)}</Notice>}
      <Button pending={signingIn}>{signingIn ? t("signIn.submitting") : t("signIn.submit")}</Button>
      {(AUTH_METHODS.emailLink || AUTH_METHODS.google) && <Divider>{t("or")}</Divider>}
      {AUTH_METHODS.emailLink && (
        <Button variant="secondary" formAction={linkAction} pending={sending}>
          {sending ? t("emailLink.sending") : t("emailLink.submit")}
        </Button>
      )}
    </form>
  );
}
