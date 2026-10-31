import { Suspense } from "react";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LogoFull, LogoMark } from "@/components/Logo";
import { CONTACT, COMPANY } from "@/config/company";
import { isLocale, publicHref, type Locale } from "@/i18n/config";
import { money, number } from "@/lib/format";
import { WaitlistForm } from "./WaitlistForm";

// Example figures shown on the page (illustrative only).
const EXAMPLE = { rent: 350_000, months: 3, fee: 5_250 };
const POINTS = ["money", "landlord", "fast"] as const;

export default async function ComingSoon({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "hu";
  setRequestLocale(locale);
  const t = await getTranslations("comingSoon");
  const c = await getTranslations("common");
  const deposit = EXAMPLE.rent * EXAMPLE.months;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-8">
        <LogoFull height={32} />
        <span className="rounded-full bg-lime px-3.5 py-1.5 text-xs font-bold tracking-[0.12em] text-ink uppercase">
          {c("comingSoon")}
        </span>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-4 pt-6 pb-16 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pt-10">
        <section>
          <p className="text-sm font-bold tracking-[0.14em] text-green">{t("eyebrow")}</p>
          <h1 className="font-display mt-3 text-[44px] leading-[1.02] font-bold sm:text-6xl lg:text-[68px]">{t("title")}</h1>
          <p className="mt-5 max-w-xl text-lg text-muted sm:text-xl">
            {t("lead", { rent: number(EXAMPLE.rent, locale), deposit: money(deposit, locale) })}
          </p>
          <div className="mt-8">
            <Suspense>
              <WaitlistForm locale={locale} privacyHref={publicHref("privacy", locale)} />
            </Suspense>
          </div>
        </section>

        <aside aria-label={t("example.label")} className="flex flex-col gap-4">
          <div className="rounded-3xl bg-ink p-7 text-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-[0.14em] text-lime">{t("example.label")}</span>
              <LogoMark size={30} light />
            </div>
            <dl className="mt-5 space-y-3 text-[15px]">
              <div className="flex justify-between border-b border-white/10 pb-3">
                <dt className="text-white/70">{t("example.rent")}</dt>
                <dd className="font-semibold">{money(EXAMPLE.rent, locale)} {t("example.perMonth")}</dd>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-3">
                <dt className="text-white/70">{t("example.deposit")}</dt>
                <dd className="font-semibold line-through decoration-lime decoration-2">{money(deposit, locale)}</dd>
              </div>
              <div className="flex items-baseline justify-between">
                <dt className="text-white/70">{t("example.fee")}</dt>
                <dd className="font-display text-3xl font-bold">
                  ~{money(EXAMPLE.fee, locale)}<span className="text-base font-semibold text-white/60"> {t("example.perMonth")}</span>
                </dd>
              </div>
            </dl>
            <p className="mt-5 rounded-2xl bg-lime px-4 py-3 font-semibold text-ink">{t("example.keep", { amount: money(deposit, locale) })}</p>
            <p className="mt-3 text-xs text-white/55">{t("example.disclaimer")}</p>
          </div>

          <ul className="grid gap-3">
            {POINTS.map((key) => (
              <li key={key} className="flex gap-4 rounded-3xl bg-white p-5">
                <span className="mt-0.5 flex size-8 flex-none items-center justify-center rounded-full bg-lime">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0C1F19" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m5 12.5 4.5 4.5L19 7.5" />
                  </svg>
                </span>
                <div>
                  <p className="font-semibold">{t(`points.${key}.title`)}</p>
                  <p className="mt-0.5 text-[15px] text-muted">{t(`points.${key}.text`)}</p>
                </div>
              </li>
            ))}
          </ul>
        </aside>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>© {new Date().getFullYear()} {COMPANY.shortName}</p>
          <nav className="flex gap-5">
            <Link href={publicHref("privacy", locale)} className="hover:text-ink">{c("privacy")}</Link>
            <a href={`mailto:${CONTACT.hello}`} className="hover:text-ink">{CONTACT.hello}</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
