"use client";

import Link from "next/link";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/Icon";
import { CodeInput } from "@/components/ui/CodeInput";
import { Button, Checkbox, INPUT_CLASS, Label, Notice, TextField, TextLink } from "@/components/ui/form";
import { InfoTip } from "@/components/ui/InfoTip";
import { PasswordField } from "@/features/auth/PasswordField";
import { Turnstile } from "@/features/bot-check/Turnstile";
import { adminSignIn, startTotpSetup, staffSignUp, verifyTotp, type StaffFormState, type TotpSetupState } from "./actions";

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
        aside={<TextLink href={forgotHref}>{auth("signIn.forgot")}</TextLink>}
      />
      {error && error !== "email" && error !== "password" && <Notice kind="error">{t(`errors.${error}`)}</Notice>}
      <Turnstile resetKey={state} />
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

type TotpFormState = StaffFormState & { attempt?: number };

/** The 6-digit authenticator code in six boxes; it is checked as soon as the sixth digit arrives. */
export function TotpForm({ factorId, next, mode, onExpired }: { factorId: string; next: string; mode: "setup" | "challenge"; onExpired?: () => void }) {
  const t = useTranslations("adminAuth");
  const id = useId();
  const form = useRef<HTMLFormElement>(null);
  // Each answer gets a new attempt number, which empties the boxes after a wrong code.
  const [state, action, pending] = useActionState<TotpFormState, FormData>(
    async (prev, data) => ({ ...(await verifyTotp(prev, data)), attempt: (prev.attempt ?? 0) + 1 }),
    idle,
  );
  const error = state.status === "error" ? state.error : undefined;
  const fieldError = error === "code" || error === "codeFormat" ? t(`errors.${error}`) : undefined;
  return (
    <form ref={form} action={action} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="factorId" value={factorId} />
      <input type="hidden" name="next" value={next} />
      <CodeInput
        key={state.attempt ?? 0}
        id={`${id}-code`}
        name="code"
        label={t(mode === "setup" ? "setup.code" : "challenge.code")}
        autoFocus={mode === "challenge" || Boolean(state.attempt)}
        error={fieldError}
        onComplete={() => {
          if (!pending) form.current?.requestSubmit();
        }}
      />
      {error === "expired" && (
        <Notice kind="error">
          <p>{t("errors.expired")}</p>
          {onExpired && (
            <button type="button" onClick={onExpired} className="mt-1 inline-flex min-h-11 items-center gap-1.5 font-semibold underline underline-offset-3">
              <Icon name="refresh" size={16} strokeWidth={2.2} />
              {t("setup.restart")}
            </button>
          )}
        </Notice>
      )}
      {(error === "rateLimit" || error === "generic") && <Notice kind="error">{t(`errors.${error}`)}</Notice>}
      <Button pending={pending}>{pending ? t("checking") : t(mode === "setup" ? "setup.submit" : "challenge.submit")}</Button>
      {mode === "challenge" && (
        <p className="flex items-center justify-center gap-1.5 text-[13px] font-medium text-muted">
          {t("challenge.noPhone")}
          <InfoTip text={t("challenge.noPhoneTip")} align="end" />
        </p>
      )}
    </form>
  );
}

/**
 * First sign-in: QR code, manual key and the first code. The authenticator is created once, when this
 * component mounts – not while the page renders – so the QR code on screen stays valid until it is used.
 */
export function TotpSetup({ next }: { next: string }) {
  const t = useTranslations("adminAuth");
  const [setup, setSetup] = useState<TotpSetupState | { status: "loading" }>({ status: "loading" });
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    startTotpSetup().then(setSetup, () => setSetup({ status: "error" }));
  }, []);

  const restart = () => {
    setSetup({ status: "loading" });
    startTotpSetup().then(setSetup, () => setSetup({ status: "error" }));
  };

  if (setup.status === "error") {
    return (
      <Notice kind="error">
        <p>{t("errors.generic")}</p>
        <button type="button" onClick={restart} className="mt-1 inline-flex min-h-11 items-center gap-1.5 font-semibold underline underline-offset-3">
          <Icon name="refresh" size={16} strokeWidth={2.2} />
          {t("setup.restart")}
        </button>
      </Notice>
    );
  }

  const ready = setup.status === "ready";
  return (
    <ol className="flex flex-col">
      <SetupStep number={1} title={t("setup.step1")} text={t("setup.step1Text")} />
      <SetupStep number={2} title={t("setup.step2")}>
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          {ready ? (
            // eslint-disable-next-line @next/next/no-img-element -- Supabase returns the QR code as an SVG data URL
            <img src={setup.qrCode} alt={t("setup.qrAlt")} width={140} height={140} className="size-35 flex-none rounded-[10px] border border-line bg-white p-1.5" />
          ) : (
            <div role="status" className="flex size-35 flex-none items-center justify-center rounded-[10px] border border-line bg-paper">
              <span className="size-5 animate-spin rounded-full border-2 border-field border-t-brand motion-reduce:animate-none" aria-hidden="true" />
              <span className="sr-only">{t("setup.preparing")}</span>
            </div>
          )}
          {ready ? <SetupKey secret={setup.secret} /> : <div aria-hidden="true" className="h-20 w-full animate-pulse rounded-lg bg-paper motion-reduce:animate-none" />}
        </div>
      </SetupStep>
      <SetupStep number={3} title={t("setup.step3")} last>
        {ready && <TotpForm key={setup.factorId} factorId={setup.factorId} next={next} mode="setup" onExpired={restart} />}
      </SetupStep>
    </ol>
  );
}

/** One numbered step of the authenticator setup, joined to the next by a hairline. */
function SetupStep({ number, title, text, last = false, children }: { number: number; title: string; text?: string; last?: boolean; children?: React.ReactNode }) {
  return (
    <li className={`relative flex gap-3.5 ${last ? "" : "pb-6"}`}>
      {!last && <span aria-hidden="true" className="absolute top-7 bottom-1 left-[10.5px] w-px bg-line" />}
      <span aria-hidden="true" className="flex size-[22px] flex-none items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">
        {number}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div>
          <p className="text-sm font-semibold">{title}</p>
          {text && <p className="mt-0.5 text-[13px] text-muted">{text}</p>}
        </div>
        {children}
      </div>
    </li>
  );
}

/** Manual setup key with a copy button (for when the QR code can't be scanned). */
export function SetupKey({ secret }: { secret: string }) {
  const t = useTranslations("adminAuth.setup");
  const [copied, setCopied] = useState(false);
  const groups = secret.match(/.{1,4}/g) ?? [secret];
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className="text-[12.5px] text-muted">{t("keyLabel")}</p>
      <code className="flex flex-wrap gap-x-2 gap-y-1 font-mono text-[13px] font-medium tracking-[0.04em]">
        {/* Groups of four never break apart. */}
        {groups.map((group, i) => (
          <span key={i}>{group}</span>
        ))}
      </code>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(secret);
          setCopied(true);
        }}
        className="inline-flex h-11 items-center gap-1.5 self-start rounded-lg border border-field bg-surface px-2.5 text-[13px] font-medium hover:border-ink sm:h-8"
      >
        <Icon name={copied ? "check" : "copy"} size={14} strokeWidth={2} />
        {copied ? t("copied") : t("copy")}
      </button>
      <span role="status" className="sr-only">
        {copied ? t("copied") : ""}
      </span>
    </div>
  );
}
