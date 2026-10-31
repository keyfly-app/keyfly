"use client";

import { Suspense, useActionState, useId } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/Icon";
import type { Locale } from "@/i18n/config";
import { joinWaitlist, type WaitlistState } from "./actions";
import { WAITLIST_SEGMENTS, type WaitlistSource } from "./config";

type Props = { locale: Locale; privacyHref: string };

/** Full sign-up form (hero): segment chips, email, privacy consent, optional newsletter. */
export function WaitlistForm({ locale, privacyHref }: Props) {
  const t = useTranslations("waitlist");
  const [state, action, pending] = useActionState<WaitlistState, FormData>(joinWaitlist, { status: "idle" });
  const id = useId();
  if (state.status === "ok") return <Success already={state.already} />;

  const values = state.status === "error" ? state.values : undefined;
  const error = state.status === "error" ? state.error : undefined;

  return (
    <form
      action={action}
      noValidate
      className="flex flex-col gap-5.5 rounded-[28px] bg-surface p-5 shadow-[0_1px_2px_rgba(12,31,25,.06),0_24px_48px_-24px_rgba(12,31,25,.28)] sm:p-8"
    >
      <HiddenFields locale={locale} source="coming-soon-hero" />

      <fieldset className="min-w-0">
        <legend className="text-sm font-semibold">{t("legend")}</legend>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {WAITLIST_SEGMENTS.map((segment) => (
            <label
              key={segment}
              className="inline-flex min-h-11 cursor-pointer items-center rounded-full border-[1.5px] border-line bg-surface px-4.5 text-[15px] font-semibold transition-colors hover:border-brand/40 has-checked:border-brand has-checked:bg-brand has-checked:text-white has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand"
            >
              <input
                type="radio"
                name="segment"
                value={segment}
                defaultChecked={(values?.segment ?? "tenant") === segment}
                className="sr-only"
              />
              {t(`segments.${segment}`)}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-email`} className="text-sm font-semibold">
          {t("emailLabel")}
        </label>
        <div className="flex flex-wrap gap-3">
          <input
            id={`${id}-email`}
            name="email"
            type="email"
            autoComplete="email"
            placeholder={t("emailPlaceholder")}
            defaultValue={values?.email}
            aria-invalid={error === "email"}
            aria-describedby={error === "email" ? `${id}-email-error` : undefined}
            className="h-14.5 min-w-0 flex-[1_1_260px] rounded-2xl border-[1.5px] border-line bg-surface px-4.5 text-[17px] font-medium placeholder:text-muted/70 focus:border-brand aria-invalid:border-danger-ink"
          />
          <SubmitButton pending={pending} label={t("submit")} pendingLabel={t("submitting")} className="h-14.5 flex-[1_0_auto] px-7" />
        </div>
        {error === "email" && <FieldError id={`${id}-email-error`} message={t("errors.email")} />}
      </div>

      <div className="flex flex-col gap-3 text-sm leading-normal text-muted">
        <Checkbox
          name="privacy"
          defaultChecked={values?.privacy}
          invalid={error === "privacy"}
          describedBy={error === "privacy" ? `${id}-privacy-error` : undefined}
        >
          {t.rich("privacyConsent", { link: (chunks) => <PrivacyLink href={privacyHref}>{chunks}</PrivacyLink> })}
        </Checkbox>
        {error === "privacy" && <FieldError id={`${id}-privacy-error`} message={t("errors.privacy")} className="pl-8" />}
        <Checkbox name="marketing" defaultChecked={values?.marketing}>
          {t("marketingConsent")}
        </Checkbox>
      </div>

      {(error === "segment" || error === "generic") && <FormError message={t(`errors.${error}`)} />}
    </form>
  );
}

/** Compact sign-up form (footer, on dark): segment chips, email, privacy consent. */
export function CompactWaitlistForm({ locale, privacyHref }: Props) {
  const t = useTranslations("waitlist");
  const [state, action, pending] = useActionState<WaitlistState, FormData>(joinWaitlist, { status: "idle" });
  const id = useId();
  if (state.status === "ok") return <Success already={state.already} compact />;

  const values = state.status === "error" ? state.values : undefined;
  const error = state.status === "error" ? state.error : undefined;
  const field =
    "h-14 min-w-0 rounded-2xl border-[1.5px] border-night-line bg-night text-white focus:border-lime aria-invalid:border-danger-light";

  return (
    <form action={action} noValidate className="flex flex-col gap-3.5">
      <HiddenFields locale={locale} source="coming-soon-footer" />
      <fieldset className="min-w-0">
        <legend className="sr-only">{t("compact.segmentLabel")}</legend>
        <div className="flex flex-wrap gap-2">
          {WAITLIST_SEGMENTS.map((segment) => (
            <label
              key={segment}
              className="inline-flex min-h-11 cursor-pointer items-center rounded-full border-[1.5px] border-night-line px-4 text-[15px] font-semibold transition-colors hover:border-lime has-checked:border-lime has-checked:bg-lime has-checked:text-ink has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-lime"
            >
              <input
                type="radio"
                name="segment"
                value={segment}
                defaultChecked={(values?.segment ?? "tenant") === segment}
                className="sr-only"
              />
              {t(`segments.${segment}`)}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap gap-2.5">
        <label htmlFor={`${id}-email`} className="sr-only">
          {t("emailLabel")}
        </label>
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          autoComplete="email"
          placeholder={t("emailPlaceholder")}
          defaultValue={values?.email}
          aria-invalid={error === "email"}
          aria-describedby={error === "email" ? `${id}-email-error` : undefined}
          className={`${field} flex-[1_1_220px] px-4 text-base font-medium placeholder:text-fog-dim`}
        />
        <SubmitButton pending={pending} label={t("compact.submit")} pendingLabel={t("submitting")} variant="lime" className="h-14 flex-[1_0_auto] px-6.5" />
      </div>
      {error === "email" && <FieldError id={`${id}-email-error`} message={t("errors.email")} onDark />}
      <Checkbox
        name="privacy"
        defaultChecked={values?.privacy}
        invalid={error === "privacy"}
        describedBy={error === "privacy" ? `${id}-privacy-error` : undefined}
        onDark
      >
        {t.rich("compact.privacyConsent", { link: (chunks) => <PrivacyLink href={privacyHref} onDark>{chunks}</PrivacyLink> })}
      </Checkbox>
      {error === "privacy" && <FieldError id={`${id}-privacy-error`} message={t("errors.privacy")} className="pl-8" onDark />}
      {(error === "segment" || error === "generic") && <FormError message={t(`errors.${error}`)} />}
    </form>
  );
}

function HiddenFields({ locale, source }: { locale: Locale; source: WaitlistSource }) {
  return (
    <>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="source" value={source} />
      {/* Honeypot: visually hidden and skipped by keyboard and screen readers. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      <Suspense>
        <UtmFields />
      </Suspense>
    </>
  );
}

function UtmFields() {
  const params = useSearchParams();
  return ["utm_source", "utm_medium", "utm_campaign"].map((key) => (
    <input key={key} type="hidden" name={key} value={params.get(key) ?? ""} />
  ));
}

function SubmitButton({
  pending,
  label,
  pendingLabel,
  variant = "brand",
  className = "",
}: {
  pending: boolean;
  label: string;
  pendingLabel: string;
  variant?: "brand" | "lime";
  className?: string;
}) {
  const colors =
    variant === "lime" ? "bg-lime text-ink hover:bg-lime-light" : "bg-brand text-white hover:bg-brand-dark";
  return (
    <button
      type="submit"
      aria-disabled={pending}
      onClick={(e) => pending && e.preventDefault()}
      className={`rounded-full text-base font-bold transition-[background-color,transform] duration-200 active:scale-[.98] aria-disabled:opacity-70 ${colors} ${className}`}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

function Checkbox({
  name,
  defaultChecked,
  invalid,
  describedBy,
  onDark = false,
  children,
}: {
  name: string;
  defaultChecked?: boolean;
  invalid?: boolean;
  describedBy?: string;
  onDark?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`flex cursor-pointer items-start gap-3 ${onDark ? "text-sm text-fog" : ""}`}>
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={`mt-px size-5 flex-none ${onDark ? "accent-lime" : "accent-brand"}`}
      />
      <span>{children}</span>
    </label>
  );
}

function PrivacyLink({ href, onDark = false, children }: { href: string; onDark?: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={`font-semibold underline underline-offset-3 ${onDark ? "text-lime" : "text-brand"}`}>
      {children}
    </Link>
  );
}

function FieldError({ id, message, className = "", onDark = false }: { id: string; message: string; className?: string; onDark?: boolean }) {
  return (
    <p id={id} role="alert" className={`flex items-start gap-2 text-sm font-semibold ${onDark ? "text-danger-light" : "text-danger-ink"} ${className}`}>
      <Icon name="alert" size={18} strokeWidth={2.2} className="mt-px flex-none" />
      <span>{message}</span>
    </p>
  );
}

function FormError({ message }: { message: string }) {
  return (
    <p role="alert" className="flex items-start gap-2 rounded-2xl bg-danger-soft px-3.5 py-3 text-sm font-semibold text-danger-ink">
      <Icon name="alert" size={18} strokeWidth={2.2} className="mt-px flex-none" />
      <span>{message}</span>
    </p>
  );
}

function Success({ already, compact = false }: { already: boolean; compact?: boolean }) {
  const t = useTranslations("waitlist.success");
  return (
    <div
      role="status"
      className={`anim-rise flex items-start gap-5 rounded-[28px] ${compact ? "bg-lime-soft p-6 text-ink" : "bg-lime-soft p-6 sm:p-9"}`}
    >
      <span aria-hidden="true" className="flex size-13 flex-none items-center justify-center rounded-full bg-brand text-white">
        <Icon name={already ? "mail" : "check"} size={24} strokeWidth={already ? 2 : 3} />
      </span>
      <div className="flex flex-col gap-1.5">
        <p className="font-display text-[26px] leading-tight font-bold">{already ? t("alreadyTitle") : t("title")}</p>
        <p className="text-[17px] text-ink-soft">{already ? t("alreadyText") : t("text")}</p>
      </div>
    </div>
  );
}
