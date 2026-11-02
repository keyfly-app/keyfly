import "server-only";
import { getTranslations } from "next-intl/server";
import { siteHref } from "@/lib/site-href";
import type { SettingsLink } from "./SettingsNav";

/** The personal settings pages, in menu order. They are the same in every account. */
export async function personalSettingsLinks(): Promise<SettingsLink[]> {
  const t = await getTranslations("settings");
  return [
    { href: await siteHref("portal", "/settings/profile"), label: t("nav.profile"), icon: "user", text: t("index.profileText") },
    { href: await siteHref("portal", "/settings/devices"), label: t("nav.devices"), icon: "laptop", text: t("index.devicesText") },
  ];
}

/** A company's settings pages (canvas Menütérkép: account things hang off the account switcher). */
export async function companySettingsLinks(slug: string): Promise<SettingsLink[]> {
  const t = await getTranslations("companies.menu");
  return [
    { href: await siteHref("portal", `/c/${slug}/settings/company`), label: t("company"), icon: "building", text: t("companyText") },
    { href: await siteHref("portal", `/c/${slug}/settings/team`), label: t("team"), icon: "users", text: t("teamText") },
  ];
}
