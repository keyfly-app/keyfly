import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { AdminShell } from "@/components/AdminShell";
import { Tag } from "@/components/ui/Tag";
import { ResetMfaButton } from "@/features/staff-auth/ResetMfaButton";
import { StaffInviteForm } from "@/features/staff-auth/StaffInviteForm";
import { isLocale } from "@/i18n/config";
import { date } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminStaff");
  return { title: t("title"), robots: { index: false } };
}

/** Super admin (App v2.2): colleagues with their two-step verification status; invite in a dialog; reset a lost authenticator. */
export default async function Staff() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const { data: staff, error } = await supabase.rpc("staff_overview");
  if (error || !staff || !auth?.claims) notFound();

  const t = await getTranslations("adminStaff");
  const raw = await getLocale();
  const locale = isLocale(raw) ? raw : "hu";
  const me = auth.claims.sub;
  const self = staff.find((s) => s.user_id === me);

  return (
    <AdminShell
      active="staff"
      title={t("title")}
      user={{ name: self?.full_name ?? "", email: String(auth.claims.email ?? "") }}
      superadmin
      actions={<StaffInviteForm />}
    >
      <p className="text-[12.5px] text-muted">{t("count", { count: staff.length })}</p>
      <section className="overflow-hidden rounded-xl border border-line bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line text-xs text-muted">
                <th scope="col" className="h-9 px-4 font-medium">{t("columns.member")}</th>
                <th scope="col" className="h-9 px-4 font-medium">{t("columns.role")}</th>
                <th scope="col" className="h-9 px-4 font-medium">{t("columns.twoFactor")}</th>
                <th scope="col" className="h-9 px-4 font-medium">{t("columns.lastSignIn")}</th>
                <th scope="col" className="h-9 px-4"><span className="sr-only">{t("columns.actions")}</span></th>
              </tr>
            </thead>
            <tbody className="text-[13.5px]">
              {staff.map((s) => {
                const name = s.full_name || s.email;
                const initials = name.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
                return (
                  <tr key={s.user_id} className="border-b border-paper last:border-0">
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-2.5">
                        <span aria-hidden="true" className="flex size-7.5 flex-none items-center justify-center rounded-full bg-mist text-[11.5px] font-semibold text-brand">{initials}</span>
                        <span className="flex min-w-0 flex-col leading-[18px]">
                          <span className="font-medium">
                            {name} {s.user_id === me && <span className="font-normal text-muted">{t("you")}</span>}
                          </span>
                          <span className="text-[12.5px] text-muted">{s.email}</span>
                        </span>
                      </span>
                    </td>
                    <td className="px-4">{t(`roles.${s.role}`)}</td>
                    <td className="px-4">
                      {s.disabled_at ? <Tag tone="neutral">{t("disabled")}</Tag> : s.has_2fa ? <Tag tone="ok">{t("on")}</Tag> : <Tag tone="warning">{t("notSetUp")}</Tag>}
                    </td>
                    <td className="px-4 text-muted tabular-nums">{s.last_sign_in_at ? date(s.last_sign_in_at, locale) : t("never")}</td>
                    <td className="px-4 text-right">{s.has_2fa && s.user_id !== me && !s.disabled_at && <ResetMfaButton userId={s.user_id} name={name} />}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <p className="text-[12.5px] text-muted">{t("selfNote")}</p>
    </AdminShell>
  );
}
