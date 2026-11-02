"use client";

import { useActionState, useId } from "react";
import { useTranslations } from "next-intl";
import { Button, Checkbox, Divider, Notice, TextField, TextLink } from "@/components/ui/form";
import { AUTH_METHODS } from "@/config/auth";
import { signIn, type FormState } from "./actions";
import { GoogleButton } from "./GoogleButton";
import { PasswordField } from "./PasswordField";

/** Email + password sign-in; below it "Folytatás Google-fiókkal" (canvas v2.4 "Belépés – Google-fiókkal is"). */
export function SignInForm({ next, forgotHref }: { next: string; forgotHref: string }) {
  const t = useTranslations("auth");
  const id = useId();
  const [state, passwordAction, signingIn] = useActionState<FormState, FormData>(signIn, { status: "idle" });
  const error = state.status === "error" ? state.error : undefined;
  const email = state.status === "error" ? state.email : undefined;

  return (
    <div className="flex flex-col gap-4">
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
          aside={<TextLink href={forgotHref}>{t("signIn.forgot")}</TextLink>}
        />
        <Checkbox id={`${id}-remember`} name="remember">
          {t("signIn.remember")}
        </Checkbox>
        {error && error !== "email" && error !== "password" && <Notice kind="error">{t(`errors.${error}`)}</Notice>}
        <Button pending={signingIn}>{signingIn ? t("signIn.submitting") : t("signIn.submit")}</Button>
      </form>
      {AUTH_METHODS.google && (
        <>
          <Divider>{t("or")}</Divider>
          <GoogleButton label={t("google.signIn")} next={next} />
        </>
      )}
    </div>
  );
}
