import "server-only";
import { getTranslations } from "next-intl/server";
import { accountInitials, myAccounts } from "@/features/companies/accounts";
import { siteHref } from "@/lib/site-href";
import type { SettingsGroup, SettingsLink } from "./SettingsNav";

/** Your personal settings pages, in menu order. They are the same in every account. */
export async function personalSettingsLinks(): Promise<SettingsLink[]> {
  const t = await getTranslations("settings.nav");
  return [
    { href: await siteHref("portal", "/settings/profile"), label: t("profile"), icon: "user" },
    { href: await siteHref("portal", "/settings/security"), label: t("security"), icon: "lock" },
    { href: await siteHref("portal", "/settings/bank"), label: t("bank"), icon: "bank" },
    { href: await siteHref("portal", "/settings/notifications"), label: t("notifications"), icon: "bell" },
    { href: await siteHref("portal", "/settings/data"), label: t("data"), icon: "shield" },
  ];
}

/** A company's settings pages: the tabs of its settings (canvas v2.4 "Beállítások – cég fülekkel"). */
export async function companySettingsLinks(slug: string): Promise<SettingsLink[]> {
  const t = await getTranslations("companies.menu");
  return [
    { href: await siteHref("portal", `/c/${slug}/settings/company`), label: t("company") },
    { href: await siteHref("portal", `/c/${slug}/settings/bank`), label: t("bank") },
    { href: await siteHref("portal", `/c/${slug}/settings/team`), label: t("team") },
  ];
}

/** The whole settings menu: Összefoglaló · Személyes · Cégeim (each company one item) · Cég hozzáadása. */
export async function settingsMenu(): Promise<{ label: string; groups: SettingsGroup[]; add: { href: string; label: string } }> {
  const [t, a, personal, accounts] = await Promise.all([getTranslations("settings.nav"), getTranslations("accounts"), personalSettingsLinks(), myAccounts()]);
  const companies = await Promise.all(
    accounts
      .filter((acc) => acc.kind === "company" && acc.slug)
      .map(async (acc) => ({
        href: await siteHref("portal", `/c/${acc.slug}/settings/company`),
        prefix: await siteHref("portal", `/c/${acc.slug}/settings`),
        label: acc.name,
        initials: accountInitials(acc.name),
        logoUrl: acc.logoUrl,
      })),
  );
  return {
    label: t("label"),
    groups: [
      { links: [{ href: await siteHref("portal", "/settings"), label: t("summary"), icon: "layout" }] },
      { heading: t("personal"), links: personal },
      ...(companies.length ? [{ heading: t("companies"), links: companies }] : []),
    ],
    add: { href: await siteHref("portal", "/companies/new"), label: a("add") },
  };
}
