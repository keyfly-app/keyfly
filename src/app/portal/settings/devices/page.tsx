import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { SessionList, type SessionRow } from "@/features/settings/SessionList";
import { SettingsHeader } from "@/features/settings/SettingsHeader";
import { describeDevice } from "@/features/settings/user-agent";
import { isLocale } from "@/i18n/config";
import { dateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings");
  return { title: t("devices.title"), robots: { index: false } };
}

/** Eszközök: where this person is signed in; other sessions can be ended. */
export default async function DevicesSettings() {
  const [t, raw, supabase] = await Promise.all([getTranslations("settings"), getLocale(), createClient()]);
  const locale = isLocale(raw) ? raw : "hu";
  const { data } = await supabase.rpc("my_sessions");
  const rows: SessionRow[] = (data ?? []).map((s) => {
    const device = describeDevice(s.user_agent);
    return {
      id: s.id,
      device: device ? t("devices.on", { browser: device.browser, os: device.os }).replace(/ · $/, "") : t("devices.unknown"),
      mobile: device?.mobile ?? false,
      detail: s.is_current ? t("devices.signedIn", { date: dateTime(s.created_at, locale) }) : t("devices.lastActive", { date: dateTime(s.last_active_at, locale) }),
      current: s.is_current,
    };
  });
  return (
    <>
      <SettingsHeader title={t("devices.title")} lead={t("devices.lead")} />
      <SessionList sessions={rows} />
    </>
  );
}
