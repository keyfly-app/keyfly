import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { EmailSwitch } from "@/features/notifications/EmailSwitch";
import { topicOn, type EmailTopic } from "@/features/notifications/prefs";
import { SettingsHeader } from "@/features/settings/SettingsHeader";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings.notifications");
  return { title: t("title"), robots: { index: false } };
}

type Item = { topic: EmailTopic } | { always: string };
const GROUPS: { key: string; items: Item[] }[] = [
  { key: "leases", items: [{ always: "invites" }, { topic: "lease_changes" }, { topic: "lease_expiry" }] },
  { key: "accounts", items: [{ topic: "team" }, { topic: "invoices" }] },
  { key: "keyfly", items: [{ topic: "news" }] },
  { key: "security", items: [{ always: "security" }] },
];

/** Értesítések (canvas): which emails the person wants, by topic. Invitations and security notices always go. */
export default async function NotificationSettings() {
  const [t, supabase] = await Promise.all([getTranslations("settings.notifications"), createClient()]);
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) notFound();
  const { data: profile } = await supabase.from("profiles").select("email_prefs").eq("id", auth.claims.sub).single();
  return (
    <>
      <SettingsHeader title={t("title")} lead={t("lead")} />
      {GROUPS.map((g) => (
        <section key={g.key} aria-labelledby={`notif-${g.key}`} className="rounded-xl border border-line bg-surface">
          <h2 id={`notif-${g.key}`} className="px-5 pt-5 pb-3 text-[15px] font-semibold sm:px-6">
            {t(`groups.${g.key}`)}
          </h2>
          <ul>
            {g.items.map((item) =>
              "topic" in item ? (
                <EmailSwitch key={item.topic} topic={item.topic} label={t(`topics.${item.topic}.label`)} text={t(`topics.${item.topic}.text`)} initial={topicOn(profile?.email_prefs, item.topic)} />
              ) : (
                <li key={item.always} className="flex items-center justify-between gap-4 border-t border-line px-5 py-3.5 sm:px-6">
                  <div className="flex min-w-0 flex-col">
                    <span className="text-sm font-medium">{t(`always.${item.always}.label`)}</span>
                    <span className="text-[12.5px] text-muted">{t(`always.${item.always}.text`)}</span>
                  </div>
                  <span className="flex-none text-[13px] font-medium text-muted">{t("alwaysOn")}</span>
                </li>
              ),
            )}
          </ul>
        </section>
      ))}
    </>
  );
}
