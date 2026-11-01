import "server-only";
import { getTranslations } from "next-intl/server";
import { siteHref } from "@/lib/site-href";
import type { SettingsLink } from "./SettingsNav";

/** The personal settings pages, in menu order. Account settings (company, team, plan) join here with company accounts. */
export async function personalSettingsLinks(): Promise<SettingsLink[]> {
  const t = await getTranslations("settings");
  return [
    { href: await siteHref("portal", "/settings/profile"), label: t("nav.profile"), icon: "user", text: t("index.profileText") },
    { href: await siteHref("portal", "/settings/devices"), label: t("nav.devices"), icon: "laptop", text: t("index.devicesText") },
  ];
}
