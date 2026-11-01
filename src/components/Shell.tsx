import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { AppFooter } from "@/components/AppFooter";
import { Icon } from "@/components/Icon";
import { LogoFull } from "@/components/Logo";
import { signOut } from "@/features/auth/actions";
import { LanguageToggle } from "@/features/language/LanguageToggle";
import { isLocale } from "@/i18n/config";
import type { AppSite } from "@/lib/sites";

/**
 * Signed-in frame of the app (App v2.2): white top bar with the logo, language and the account menu;
 * content on the paper ground in a 1120 px column; quiet footer. The account menu works without JavaScript.
 */
export async function Shell({ site, email, name, children }: { site: AppSite; email?: string | null; name?: string | null; children: React.ReactNode }) {
  const t = await getTranslations("common");
  const portal = await getTranslations("portal");
  const raw = await getLocale();
  const locale = isLocale(raw) ? raw : "hu";
  const label = name || email || "";
  const initials = label
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-14 max-w-[1120px] items-center justify-between gap-4 px-4 sm:px-8">
          <LogoFull height={20} />
          <div className="flex items-center gap-2.5">
            <Suspense>
              <LanguageToggle to={locale === "hu" ? "en" : "hu"} />
            </Suspense>
            {email && (
              <details className="group relative">
                <summary className="flex h-11 cursor-pointer list-none items-center gap-2 rounded-full border border-line bg-surface py-1 pr-2 pl-1 text-[13px] font-medium hover:border-field sm:h-8 [&::-webkit-details-marker]:hidden">
                  <span aria-hidden="true" className="flex size-6 items-center justify-center rounded-full bg-mist text-[10.5px] font-semibold text-brand">
                    {initials}
                  </span>
                  <span className="hidden max-w-40 truncate sm:inline">{label}</span>
                  <span className="sr-only sm:hidden">{portal("account")}</span>
                  <Icon name="chevronDown" size={14} className="text-muted transition-transform group-open:rotate-180 motion-reduce:transition-none" />
                </summary>
                <div className="absolute right-0 z-30 mt-2 w-64 rounded-xl border border-line bg-surface p-1.5 shadow-[0_16px_40px_-16px_rgb(12_31_25/0.3)]">
                  <p className="truncate px-2.5 pt-1.5 pb-2 text-[12.5px] text-muted">{email}</p>
                  <form action={signOut}>
                    <input type="hidden" name="site" value={site} />
                    <button type="submit" className="flex h-11 w-full items-center gap-2 rounded-lg px-2.5 text-left text-[13.5px] font-medium hover:bg-paper sm:h-9">
                      <Icon name="logout" size={16} className="text-muted" />
                      {t("signOut")}
                    </button>
                  </form>
                </div>
              </details>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      <AppFooter />
    </div>
  );
}
