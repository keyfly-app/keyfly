"use client";

import Link from "next/link";
import { useActionState, useId } from "react";
import { useTranslations } from "next-intl";
import { Button, Checkbox, Notice, TextField } from "@/components/ui/form";
import { cancelGoogleSignUp, finishGoogleSignUp, type FormState } from "./actions";
import { GoogleMark } from "./GoogleButton";

/** "Még egy lépés": who Google says you are, your name as Keyfly should show it, the terms (not ticked in advance). */
export function GoogleSignUpForm({
  next,
  googleName,
  googleEmail,
  defaultName,
  privacyHref,
}: {
  next: string;
  googleName: string | null;
  googleEmail: string;
  defaultName: string;
  privacyHref: string;
}) {
  const t = useTranslations("auth");
  const id = useId();
  const [state, action, pending] = useActionState<FormState, FormData>(finishGoogleSignUp, { status: "idle" });
  const error = state.status === "error" ? state.error : undefined;
  const initials = (googleName ?? googleEmail)
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toLocaleUpperCase())
    .join("");
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-[10px] border border-line bg-paper/60 px-3.5 py-3">
        <span aria-hidden="true" className="flex size-9 flex-none items-center justify-center rounded-full bg-mist text-[13px] font-semibold text-brand">
          {initials}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          {googleName && <span className="truncate text-sm font-semibold">{googleName}</span>}
          <span className="truncate text-[13px] text-muted">{googleEmail}</span>
        </span>
        <GoogleMark />
      </div>
      <form action={action} noValidate className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <TextField
          id={`${id}-name`}
          name="fullName"
          label={t("register.fullName")}
          autoComplete="name"
          defaultValue={defaultName}
          error={error === "name" ? t("errors.name") : undefined}
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
        {error === "generic" && <Notice kind="error">{t("errors.generic")}</Notice>}
        <Button pending={pending}>{pending ? t("register.submitting") : t("register.submit")}</Button>
      </form>
      <form action={cancelGoogleSignUp} className="flex justify-center">
        <input type="hidden" name="next" value={next} />
        <button type="submit" className="inline-flex min-h-11 items-center text-sm font-semibold text-ink-soft underline-offset-3 hover:underline sm:min-h-8">
          {t("google.other")}
        </button>
      </form>
    </div>
  );
}
