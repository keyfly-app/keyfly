import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Icon, type IconName } from "@/components/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { CompanyMark } from "@/components/ui/CompanyMark";
import { signOut } from "@/features/auth/actions";
import { accountInitials, myAccounts, type AccountSummary } from "@/features/companies/accounts";
import { LanguageMenuRow } from "@/features/language/LanguageMenuRow";
import { siteHref } from "@/lib/site-href";
import { currentUser } from "./current-user";
import { personalSettingsLinks } from "./links";

const ROW = "flex h-[50px] items-center gap-3 px-3.5 text-[15px] hover:bg-paper";
const ITEM = "flex flex-col border-b border-paper last:border-b-0";
const BOX = "flex flex-col overflow-hidden rounded-xl border border-line bg-surface";

function Row({ href, lead, label, brand = false }: { href: string; lead: React.ReactNode; label: string; brand?: boolean }) {
  return (
    <li className={ITEM}>
      <Link href={href} className={`${ROW} ${brand ? "font-semibold text-brand" : ""}`}>
        {lead}
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <Icon name="chevronRight" size={16} className="flex-none text-muted" />
      </Link>
    </li>
  );
}

const icon = (name: IconName, className = "text-muted") => <Icon name={name} size={20} className={`flex-none ${className}`} />;

/**
 * Menu on phones and tablets (canvas v3 "Mobil Menü"): you, your settings with the language, your companies, the
 * company's settings when you work in one, and sign out. `account`: the company account of a /c/<slug>/menu page.
 */
export async function MenuPage({ account }: { account?: AccountSummary }) {
  const [t, a, nav, common, user, accounts, links] = await Promise.all([
    getTranslations("menu"),
    getTranslations("accounts"),
    getTranslations("nav"),
    getTranslations("common"),
    currentUser(),
    myAccounts(),
    personalSettingsLinks(),
  ]);
  const companies = await Promise.all(accounts.filter((acc) => acc.kind === "company").map(async (acc) => ({ acc, href: await siteHref("portal", `/c/${acc.slug}`) })));
  const [profile, add, companySettings] = await Promise.all([
    siteHref("portal", "/settings/profile"),
    siteHref("portal", "/companies/new"),
    account ? siteHref("portal", `/c/${account.slug}/settings`) : Promise.resolve(null),
  ]);
  return (
    <div className="flex flex-col gap-2.5">
      <h1 className="font-display text-2xl leading-[30px] font-semibold">{t("title")}</h1>
      {user && (
        <Link href={profile} className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3.5 hover:border-field">
          <Avatar src={user.avatarUrl} initials={user.initials} size={44} />
          <span className="flex min-w-0 flex-1 flex-col gap-px">
            <span className="truncate text-[15px] leading-5 font-semibold">{user.fullName ?? user.email}</span>
            <span className="text-[13px] leading-[18px] text-muted">{t("profile")}</span>
          </span>
          <Icon name="chevronRight" size={16} className="flex-none text-muted" />
        </Link>
      )}
      <h2 className="px-1 pt-1.5 text-xs font-semibold text-muted">{t("settings")}</h2>
      <ul className={BOX}>
        {companySettings && <Row href={companySettings} lead={icon("settings")} label={nav("companySettings")} />}
        {links.map((l) => (
          <Row key={l.href} href={l.href} lead={icon(l.icon ?? "settings")} label={l.label} />
        ))}
        <li className={ITEM}>
          <LanguageMenuRow className={ROW} />
        </li>
      </ul>
      <h2 className="px-1 pt-1.5 text-xs font-semibold text-muted">{t("companies")}</h2>
      <ul className={BOX}>
        {companies.map(({ acc, href }) => (
          <Row key={acc.id} href={href} lead={<CompanyMark logoUrl={acc.logoUrl} initials={accountInitials(acc.name)} size={22} />} label={acc.name} />
        ))}
        <Row href={add} lead={<Icon name="plus" size={20} strokeWidth={2} className="flex-none" />} label={a("add")} brand />
      </ul>
      <form action={signOut} className="flex justify-center">
        <input type="hidden" name="site" value="portal" />
        <button type="submit" className="flex h-12 items-center rounded-lg px-4 text-[15px] font-semibold text-danger-ink hover:bg-surface">
          {common("signOut")}
        </button>
      </form>
    </div>
  );
}
