import { getTranslations } from "next-intl/server";
import { AppFooter } from "@/components/AppFooter";
import { LogoFull } from "@/components/Logo";
import { signOut } from "@/features/auth/actions";
import type { AppSite } from "@/lib/sites";

export async function Shell({ site, badge, email, children }: { site: AppSite; badge?: string; email?: string | null; children: React.ReactNode }) {
  const t = await getTranslations("common");
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <LogoFull height={28} />
            {badge && <span className="rounded-full bg-ink px-2.5 py-1 text-[11px] font-bold tracking-[0.12em] text-lime">{badge}</span>}
          </div>
          {email && (
            <form action={signOut} className="flex items-center gap-4 text-sm">
              <input type="hidden" name="site" value={site} />
              <span className="hidden text-muted sm:inline">{email}</span>
              <button type="submit" className="font-semibold hover:text-brand">{t("signOut")}</button>
            </form>
          )}
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-8 sm:py-10">{children}</main>
      <AppFooter />
    </div>
  );
}
