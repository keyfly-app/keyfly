import { getTranslations } from "next-intl/server";
import type { Locale, PublicPage } from "@/i18n/config";
import { date } from "@/lib/format";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

/** Frame for long-form legal documents (privacy notices, general terms, imprint). */
export async function LegalPage({
  locale,
  page,
  title,
  effective,
  note,
  children,
}: {
  locale: Locale;
  page: PublicPage;
  title: string;
  /** ISO date the document takes effect. */
  effective: string;
  /** Which language version is binding; defaults to the privacy-notice wording. */
  note?: string;
  children: React.ReactNode;
}) {
  const t = await getTranslations("legal");
  return (
    <div className="overflow-x-clip">
      <SiteHeader locale={locale} page={page} />
      <main className="mx-auto max-w-[760px] px-4 py-14 sm:px-6 sm:py-20">
        <h1 className="font-display text-[clamp(34px,4.4vw,52px)] leading-[1.08] font-bold tracking-[-0.03em]">{title}</h1>
        <p className="mt-4 text-sm text-muted">
          {t("updated", { date: date(effective, locale) })} · {note ?? t("bindingNote")}
        </p>
        <article className="mt-10 flex flex-col gap-4 text-[17px] leading-relaxed text-ink-soft [&_a]:font-semibold [&_a]:text-brand [&_a]:underline [&_a]:underline-offset-3 [&_dd]:mb-3 [&_dt]:font-semibold [&_dt]:text-ink [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_ol]:flex [&_ol]:flex-col [&_ol]:gap-2 [&_ol>li]:list-decimal [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2">
          {children}
        </article>
      </main>
      <SiteFooter locale={locale} withSignup={false} />
    </div>
  );
}
