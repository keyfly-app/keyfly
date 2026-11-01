import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Icon } from "@/components/Icon";
import { Shell } from "@/components/Shell";
import { TextLink } from "@/components/ui/form";
import { ResetMfaButton } from "@/features/staff-auth/ResetMfaButton";
import { isLocale } from "@/i18n/config";
import { date } from "@/lib/format";
import { siteHref } from "@/lib/site-href";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminStaff");
  return { title: t("title"), robots: { index: false } };
}

/** Super admin: the staff list with two-factor status; resetting a colleague's authenticator. */
export default async function Staff() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const { data: staff, error } = await supabase.rpc("staff_overview");
  if (error || !staff || !auth?.claims) notFound();

  const t = await getTranslations("adminStaff");
  const admin = await getTranslations("admin");
  const raw = await getLocale();
  const locale = isLocale(raw) ? raw : "hu";
  const me = auth.claims.sub;

  return (
    <Shell site="admin" badge="ADMIN · SUPERADMIN" email={auth.claims.email as string | undefined}>
      <TextLink href={await siteHref("admin", "/")}>{admin("overview")}</TextLink>
      <h1 className="font-display text-3xl font-bold">{t("title")}</h1>
      <p className="mt-1 text-muted">{t("count", { count: staff.length })}</p>

      <div className="mt-6 overflow-x-auto rounded-3xl bg-white p-6">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-muted">
            <tr>
              <th className="py-2 font-semibold">{t("columns.member")}</th>
              <th className="py-2 font-semibold">{t("columns.role")}</th>
              <th className="py-2 font-semibold">{t("columns.twoFactor")}</th>
              <th className="py-2 font-semibold">{t("columns.status")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {staff.map((s) => {
              const name = s.full_name || s.email;
              return (
                <tr key={s.user_id} className="align-top">
                  <td className="py-3 pr-4">
                    <span className="block font-semibold">
                      {name} {s.user_id === me && <span className="font-normal text-muted">{t("you")}</span>}
                    </span>
                    <span className="block text-[13px] text-muted">{s.email}</span>
                  </td>
                  <td className="py-3 pr-4">{t(`roles.${s.role}`)}</td>
                  <td className="py-3 pr-4">
                    {s.has_2fa ? (
                      <span className="inline-flex items-center gap-1.5 font-medium text-brand">
                        <Icon name="check" size={15} strokeWidth={2.4} />
                        {t("on")}
                      </span>
                    ) : (
                      <span className="text-muted">{t("notSetUp")}</span>
                    )}
                    {s.has_2fa && s.user_id !== me && !s.disabled_at && <ResetMfaButton userId={s.user_id} name={name} />}
                  </td>
                  <td className="py-3">
                    <span className="block font-medium">{s.disabled_at ? t("disabled") : t("active")}</span>
                    <span className="block text-[13px] text-muted">
                      {s.last_sign_in_at ? t("lastSignIn", { date: date(s.last_sign_in_at, locale) }) : t("never")}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-4 text-[13px] text-muted">{t("selfNote")}</p>
      </div>
    </Shell>
  );
}
