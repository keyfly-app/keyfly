"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/config";
import { joinWaitlist, type WaitlistState } from "./actions";

const SEGMENTS = ["tenant", "landlord", "agent", "company"] as const;
type Segment = (typeof SEGMENTS)[number];

export function WaitlistForm({ locale, privacyHref }: { locale: Locale; privacyHref: string }) {
  const t = useTranslations("waitlist");
  const [state, action, pending] = useActionState<WaitlistState, FormData>(joinWaitlist, { status: "idle" });
  const [segment, setSegment] = useState<Segment>("tenant");
  const params = useSearchParams();

  if (state.status === "ok") {
    return (
      <div role="status" className="rounded-3xl bg-lime-soft p-7">
        <p className="font-display text-2xl font-bold">{state.already ? t("success.already") : t("success.title")}</p>
        <p className="mt-2 text-muted">{t("success.text")}</p>
      </div>
    );
  }

  return (
    <form
      action={action}
      className="rounded-3xl bg-white p-6 shadow-[0_1px_2px_rgba(12,31,25,.05),0_24px_48px_-24px_rgba(12,31,25,.28)] sm:p-7"
    >
      <input type="hidden" name="locale" value={locale} />
      <fieldset>
        <legend className="text-sm font-semibold">{t("whoLabel")}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {SEGMENTS.map((id) => (
            <label
              key={id}
              className={`cursor-pointer rounded-full border-[1.5px] px-4 py-2.5 text-[15px] font-semibold transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-green ${
                segment === id ? "border-green bg-mint text-green" : "border-line bg-white hover:border-green/40"
              }`}
            >
              <input type="radio" name="segment" value={id} checked={segment === id} onChange={() => setSegment(id)} className="sr-only" />
              {t(`segments.${id}`)}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="mt-5 block text-sm font-semibold" htmlFor="email">
        {t("emailLabel")}
      </label>
      <div className="mt-1.5 flex flex-col gap-3 sm:flex-row">
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder={t("emailPlaceholder")}
          className="h-14 min-w-0 flex-1 rounded-2xl border-[1.5px] border-line px-4 text-[17px] font-medium placeholder:text-muted/60 focus:border-green"
        />
        <button
          type="submit"
          disabled={pending}
          className="h-14 rounded-full bg-green px-7 font-bold text-white transition-colors hover:bg-green-dark disabled:opacity-60"
        >
          {pending ? t("submitting") : t("submit")}
        </button>
      </div>

      {/* honeypot */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      {["utm_source", "utm_medium", "utm_campaign"].map((k) => (
        <input key={k} type="hidden" name={k} value={params.get(k) ?? ""} />
      ))}

      <div className="mt-4 space-y-2 text-sm text-muted">
        <label className="flex items-start gap-2.5">
          <input type="checkbox" name="privacy" required className="mt-0.5 size-[18px] accent-green" />
          <span>
            {t.rich("privacyConsent", {
              link: (chunks) => (
                <Link href={privacyHref} className="font-semibold text-green underline underline-offset-2">
                  {chunks}
                </Link>
              ),
            })}
          </span>
        </label>
        <label className="flex items-start gap-2.5">
          <input type="checkbox" name="marketing" className="mt-0.5 size-[18px] accent-green" />
          <span>{t("marketingConsent")}</span>
        </label>
      </div>

      {state.status === "error" && (
        <p role="alert" className="mt-4 rounded-2xl bg-warn px-4 py-3 text-sm font-semibold text-[#6B3D00]">
          {t(`errors.${state.error}`)}
        </p>
      )}
    </form>
  );
}
