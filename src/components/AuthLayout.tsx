import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AppFooter } from "@/components/AppFooter";
import { Icon } from "@/components/Icon";
import { LogoFull } from "@/components/Logo";

/**
 * Frame for sign-in, sign-up and invitation pages: slim header, one narrow column.
 * Phone: content on the page background. Wider screens: a centred card.
 */
export async function AuthLayout({ back, badge, children }: { back?: { href: string; label: string }; badge?: string; children: React.ReactNode }) {
  const t = await getTranslations("common");
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-14 items-center border-b border-line bg-surface px-4">
        {back ? (
          <Link href={back.href} className="-ml-2 inline-flex min-h-11 items-center gap-1 px-2 text-sm font-semibold text-ink">
            <Icon name="back" size={18} />
            {back.label}
          </Link>
        ) : (
          <div className="flex items-center gap-3">
            <LogoFull height={22} />
            <span className="sr-only">{t("brand")}</span>
            {badge && <span className="rounded-full bg-ink px-2.5 py-1 text-[11px] font-bold tracking-[0.12em] text-lime">{badge}</span>}
          </div>
        )}
      </header>
      <main className="flex flex-1 justify-center px-5 py-6 sm:items-start sm:py-14">
        <div className="flex w-full max-w-[440px] flex-col gap-4 sm:rounded-2xl sm:border sm:border-line sm:bg-surface sm:p-8">{children}</div>
      </main>
      <AppFooter />
    </div>
  );
}
