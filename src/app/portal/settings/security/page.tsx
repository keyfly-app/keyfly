import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Notice } from "@/components/ui/form";
import { TrustedDevices, type TrustedRow } from "@/features/security/TrustedDevices";
import { currentTrustedId } from "@/features/security/trusted";
import { TwoStepCard } from "@/features/security/TwoStepCard";
import { currentUser } from "@/features/settings/current-user";
import { ProfileDetails } from "@/features/settings/ProfileDetails";
import { SessionList, type SessionRow } from "@/features/settings/SessionList";
import { SettingsHeader } from "@/features/settings/SettingsHeader";
import { describeDevice } from "@/features/settings/user-agent";
import { isLocale } from "@/i18n/config";
import { date, dateTime } from "@/lib/format";
import { siteHref } from "@/lib/site-href";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings");
  return { title: t("security.title"), robots: { index: false } };
}

/** Bejelentkezés és biztonság: email and password, two-step verification, trusted devices, the active sign-ins. */
export default async function SecuritySettings({ searchParams }: { searchParams: Promise<{ recovered?: string }> }) {
  const [{ recovered }, t, raw, user, supabase] = await Promise.all([searchParams, getTranslations("settings"), getLocale(), currentUser(), createClient()]);
  if (!user) notFound();
  const locale = isLocale(raw) ? raw : "hu";
  const [{ data: sessions }, { data: factors }, { data: codesLeft }, { data: trustedRows }, { data: level }, currentTrusted, setupHref] = await Promise.all([
    supabase.rpc("my_sessions"),
    supabase.auth.mfa.listFactors(),
    supabase.rpc("recovery_codes_left"),
    supabase.from("trusted_devices").select("id, label, created_at, expires_at").gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    currentTrustedId(),
    siteHref("portal", "/security/two-step"),
  ]);
  const factor = factors?.totp[0];
  const nbsp = (s: string) => s.replace(/ /g, "\u00a0");
  const trusted: TrustedRow[] = factor
    ? (trustedRows ?? []).map((d) => ({
        id: d.id,
        label: d.label === "–" ? t("devices.unknown") : d.label,
        mobile: /iPhone|Android|iPad/.test(d.label),
        marked: nbsp(date(d.created_at, locale)),
        expires: nbsp(date(d.expires_at, locale)),
        current: d.id === currentTrusted,
      }))
    : [];
  const rows: SessionRow[] = (sessions ?? []).map((s) => {
    const device = describeDevice(s.user_agent);
    return {
      id: s.id,
      device: device ? t("devices.on", { browser: device.browser, os: device.os }).replace(/ · $/, "") : t("devices.unknown"),
      mobile: device?.mobile ?? false,
      detail: s.is_current ? t("devices.activeNow") : t("devices.lastActive", { date: dateTime(s.last_active_at, locale) }),
      current: s.is_current,
    };
  });
  return (
    <>
      <SettingsHeader title={t("security.title")} lead={t("security.lead")} />
      {recovered && <Notice kind="warning">{t("security.recovered")}</Notice>}
      <ProfileDetails
        title={t("security.credentials")}
        items={["email", "password"]}
        name={user.fullName}
        email={user.email}
        pendingEmail={user.pendingEmail}
        phone={user.phone}
        phoneVerified={Boolean(user.phoneVerifiedAt)}
        passwordChanged={user.passwordChangedAt ? date(user.passwordChangedAt, locale).replace(/ /g, "\u00a0") : null}
      />
      <TwoStepCard
        enabled={Boolean(factor)}
        since={factor ? date(factor.updated_at, locale) : null}
        codesLeft={codesLeft ?? 0}
        setupHref={setupHref}
        needsCode={level?.currentLevel !== "aal2"}
      />
      <TrustedDevices devices={trusted} />
      <SessionList sessions={rows} />
    </>
  );
}
