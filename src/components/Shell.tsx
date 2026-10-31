import { getTranslations } from "next-intl/server";
import { LogoFull } from "@/components/Logo";
import { signOut } from "@/lib/auth";
import type { AppSite } from "@/lib/sites";

export async function Shell({ site, badge, email, children }: { site: AppSite; badge?: string; email?: string | null; children: React.ReactNode }) {
  const t = await getTranslations("common");
  return (
    <div className="min-h-dvh">
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
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">{children}</main>
    </div>
  );
}

export function LoginCard({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto mt-6 max-w-md rounded-3xl bg-white p-7 shadow-[0_1px_2px_rgba(12,31,25,.05),0_24px_48px_-24px_rgba(12,31,25,.28)]">
      <h1 className="font-display text-3xl font-bold">{title}</h1>
      <p className="mt-2 mb-6 text-muted">{text}</p>
      {children}
    </div>
  );
}
