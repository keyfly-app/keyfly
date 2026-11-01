"use client";

import Link from "next/link";
import { useActionState, useId } from "react";
import { useTranslations } from "next-intl";
import { Button, Checkbox, Notice, TextField } from "@/components/ui/form";
import { signUp, type FormState } from "./actions";
import { PasswordField } from "./PasswordField";

/** Name, email, password (with live rules) and the terms – no box is ticked in advance. */
export function SignUpForm({ next, privacyHref }: { next: string; privacyHref: string }) {
  const t = useTranslations("auth");
  const id = useId();
  const [state, action, pending] = useActionState<FormState, FormData>(signUp, { status: "idle" });
  const error = state.status === "error" ? state.error : undefined;
  const email = state.status === "error" ? state.email : undefined;

  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <TextField
        id={`${id}-name`}
        name="fullName"
        label={t("register.fullName")}
        autoComplete="name"
        error={error === "name" ? t("errors.name") : undefined}
      />
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
        autoComplete="new-password"
        rules
        error={error === "password" ? t("errors.password") : undefined}
      />
      <Checkbox id={`${id}-terms`} name="terms" error={error === "terms" ? t("errors.terms") : undefined}>
        {t.rich("register.terms", {
          terms: (chunks) => <span className="font-semibold">{chunks}</span>,
          privacy: (chunks) => (
            <Link href={privacyHref} target="_blank" rel="noopener" className="font-semibold text-brand underline underline-offset-3">
              {chunks}
              <span className="sr-only"> ({t("newTab")})</span>
            </Link>
          ),
        })}
      </Checkbox>
      {(error === "rateLimit" || error === "generic") && <Notice kind="error">{t(`errors.${error}`)}</Notice>}
      <Button pending={pending}>{pending ? t("register.submitting") : t("register.submit")}</Button>
    </form>
  );
}
