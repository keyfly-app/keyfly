import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LogoFull } from "@/components/Logo";
import { COMPANY, CONTACT } from "@/config/company";
import { CompactWaitlistForm } from "@/features/waitlist/WaitlistForm";
import { publicHref, type Locale } from "@/i18n/config";

/**
 * Public-site footer: waitlist call to action (optional), logo, company name and legal links (terms, the waitlist and
 * app privacy notices, imprint).
 * `signupFor="landlords"` (Pro page) preselects the landlord segment and tags the sign-up source.
 */
export async function SiteFooter({
  locale,
  withSignup = true,
  signupFor = "everyone",
}: {
  locale: Locale;
  withSignup?: boolean;
  signupFor?: "everyone" | "landlords";
}) {
  const t = await getTranslations("comingSoon.footer");
  const c = await getTranslations("common");
  const link = "inline-flex min-h-11 items-center text-fog no-underline hover:text-white";

  return (
    <footer className="on-dark bg-ink text-white">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-12 px-4 pt-16 pb-8 sm:gap-20 sm:px-6 sm:pt-26">
        {withSignup && (
          <div id="signup" className="flex scroll-mt-6 flex-wrap items-end gap-x-16 gap-y-8">
            <div data-reveal className="flex min-w-0 flex-[1_1_380px] flex-col gap-3.5">
              <h2 className="font-display text-[clamp(34px,4.4vw,60px)] leading-[1.04] font-bold tracking-[-0.03em]">
                {t.rich("title", { mark: (chunks) => <span className="marker-in">{chunks}</span> })}
              </h2>
              <p className="text-lg text-fog">{t("lead")}</p>
            </div>
            <div data-reveal style={{ "--d": 1 } as React.CSSProperties} className="min-w-0 flex-[1.2_1_460px]">
              {signupFor === "landlords" ? (
                <CompactWaitlistForm
                  locale={locale}
                  privacyHref={publicHref("privacy", locale)}
                  source="pro-footer"
                  defaultSegment="landlord"
                />
              ) : (
                <CompactWaitlistForm locale={locale} privacyHref={publicHref("privacy", locale)} />
              )}
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 border-t border-white/12 pt-6">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <LogoFull height={26} light />
            <p className="text-sm text-fog-dim">
              © {new Date().getFullYear()} {COMPANY.shortName}
            </p>
          </div>
          <nav aria-label={c("legalNav")} className="flex flex-wrap gap-x-6 text-sm">
            <Link href={publicHref("terms", locale)} className={link}>
              {c("terms")}
            </Link>
            <Link href={publicHref("privacy", locale)} className={link}>
              {c("privacyNotice")}
            </Link>
            <Link href={publicHref("appPrivacy", locale)} className={link}>
              {c("appPrivacyNotice")}
            </Link>
            <Link href={publicHref("imprint", locale)} className={link}>
              {c("imprint")}
            </Link>
            <a href={`mailto:${CONTACT.hello}`} className={link}>
              {CONTACT.hello}
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
