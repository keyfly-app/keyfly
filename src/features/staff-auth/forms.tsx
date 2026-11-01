"use client";

import Link from "next/link";
import { useActionState, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Checkbox, INPUT_CLASS, Label, Notice, TextField, TextLink } from "@/components/ui/form";
import { InfoTip } from "@/components/ui/InfoTip";
import { PasswordField } from "@/features/auth/PasswordField";
import { adminSignIn, staffSignUp, verifyTotp, type StaffFormState } from "./actions";

const idle: StaffFormState = { status: "idle" };

/** Admin sign-in, step 1: email + password (no "keep me signed in": admin sessions end with the browser). */
export function AdminSignInForm({ next, forgotHref }: { next: string; forgotHref: string }) {
  const t = useTranslations("adminAuth");
  const auth = useTranslations("auth");
  const id = useId();
  const [state, action, pending] = useActionState(adminSignIn, idle);
  const error = state.status === "error" ? state.error : undefined;
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <TextField
        id={`${id}-email`}
        name="email"
        type="email"
        label={auth("email")}
        autoComplete="username"
        defaultValue={state.status === "error" ? state.email : undefined}
        error={error === "email" ? t("errors.email") : undefined}
      />
      <PasswordField
        id={`${id}-password`}
        label={auth("password")}
        autoComplete="current-password"
        error={error === "password" ? t("errors.password") : undefined}
      />
      <div className="-mt-2 flex justify-end">
        <TextLink href={forgotHref}>{auth("signIn.forgot")}</TextLink>
      </div>
      {error && error !== "email" && error !== "password" && <Notice kind="error">{t(`errors.${error}`)}</Notice>}
      <Button pending={pending}>{pending ? t("submitting") : t("submit")}</Button>
    </form>
  );
}

/** Staff account from an invitation: the address is fixed by the invitation; name, password and the terms. */
export function StaffSignUpForm({ token, email, privacyHref, signInHref }: { token: string; email: string; privacyHref: string; signInHref: string }) {
  const t = useTranslations("adminAuth");
  const auth = useTranslations("auth");
  const id = useId();
  const [state, action, pending] = useActionState(staffSignUp, idle);

  if (state.status === "sent") {
    return (
      <Notice kind="success" icon="mail">
        <p>{t("invite.sentTitle")}</p>
        <p className="mt-0.5 font-normal text-ink-soft">{t.rich("invite.sentText", { email: state.email, b: (c) => <b className="font-semibold">{c}</b> })}</p>
        <p className="mt-1.5 font-normal text-ink-soft">{t("invite.sentExisting")}</p>
      </Notice>
    );
  }

  const error = state.status === "error" ? state.error : undefined;
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-email`}>{auth("email")}</Label>
        <input id={`${id}-email`} value={email} readOnly aria-describedby={`${id}-email-help`} autoComplete="username" className={`${INPUT_CLASS} bg-mist`} />
        <p id={`${id}-email-help`} className="text-[13px] text-muted">
          {t("invite.emailHelp")}
        </p>
      </div>
      <TextField id={`${id}-name`} name="fullName" label={auth("register.fullName")} autoComplete="name" error={error === "name" ? t("errors.name") : undefined} />
      <PasswordField id={`${id}-password`} label={auth("password")} autoComplete="new-password" rules error={error === "password" ? t("errors.newPassword") : undefined} />
      <Checkbox id={`${id}-terms`} name="terms" error={error === "terms" ? t("errors.terms") : undefined}>
        {auth.rich("register.terms", {
          terms: (chunks) => <span className="font-semibold">{chunks}</span>,
          privacy: (chunks) => (
            <Link href={privacyHref} target="_blank" rel="noopener" className="font-semibold text-brand underline underline-offset-3">
              {chunks}
              <span className="sr-only"> ({auth("newTab")})</span>
            </Link>
          ),
        })}
      </Checkbox>
      {(error === "rateLimit" || error === "generic") && <Notice kind="error">{t(`errors.${error}`)}</Notice>}
      <Button pending={pending}>{pending ? auth("register.submitting") : auth("register.submit")}</Button>
      <p className="text-center text-[13px] text-muted">{t("invite.after")}</p>
      <p className="text-center text-sm text-muted">
        {t.rich("invite.haveAccount", {
          link: (c) => (
            <Link href={signInHref} className="font-semibold text-brand underline-offset-3 hover:underline">
              {c}
            </Link>
          ),
        })}
      </p>
    </form>
  );
}

/** The 6-digit authenticator code: one field (paste and autofill work), digits spaced out like the design's boxes. */
export function TotpForm({ factorId, next, mode }: { factorId: string; next: string; mode: "setup" | "challenge" }) {
  const t = useTranslations("adminAuth");
  const id = useId();
  const [state, action, pending] = useActionState(verifyTotp, idle);
  const error = state.status === "error" ? state.error : undefined;
  const fieldError = error === "code" || error === "codeFormat" ? t(`errors.${error}`) : undefined;
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="factorId" value={factorId} />
      <input type="hidden" name="next" value={next} />
      <TextField
        id={`${id}-code`}
        name="code"
        label={t(mode === "setup" ? "setup.code" : "challenge.code")}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={6}
        autoFocus={mode === "challenge"}
        error={fieldError}
        className={`${INPUT_CLASS} text-center font-display text-2xl tracking-[0.5em]`}
      />
      {(error === "rateLimit" || error === "generic") && <Notice kind="error">{t(`errors.${error}`)}</Notice>}
      <Button pending={pending}>{pending ? t("checking") : t(mode === "setup" ? "setup.submit" : "challenge.submit")}</Button>
      {mode === "challenge" && (
        <p className="flex items-center justify-center gap-1.5 text-sm font-semibold text-brand">
          {t("challenge.noPhone")}
          <InfoTip text={t("challenge.noPhoneTip")} align="end" />
        </p>
      )}
    </form>
  );
}

/** Manual setup key with a copy button (for when the QR code can't be scanned). */
export function SetupKey({ secret }: { secret: string }) {
  const t = useTranslations("adminAuth.setup");
  const [copied, setCopied] = useState(false);
  const grouped = secret.match(/.{1,4}/g)?.join(" ") ?? secret;
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[13px] text-muted">{t("keyLabel")}</p>
      <div className="flex items-center gap-2.5 rounded-xl bg-paper py-1.5 pr-1.5 pl-3.5">
        <code className="flex-1 font-mono text-[15px] font-semibold tracking-[0.06em] break-all">{grouped}</code>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(secret);
            setCopied(true);
          }}
          className="inline-flex min-h-11 items-center rounded-full border border-field bg-surface px-4 text-sm font-semibold hover:border-brand"
        >
          {copied ? t("copied") : t("copy")}
        </button>
        <span role="status" className="sr-only">
          {copied ? t("copied") : ""}
        </span>
      </div>
    </div>
  );
}
