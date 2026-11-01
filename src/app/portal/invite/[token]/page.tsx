import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { AuthLayout } from "@/components/AuthLayout";
import { Button, ButtonLink, Notice, PageTitle } from "@/components/ui/form";
import { signOut } from "@/features/auth/actions";
import { AnswerForm, type CompanyAccount } from "@/features/invitations/AnswerForm";
import { LandlordTakeOver, type LandlordAccount, type LandlordProperty } from "@/features/lease-requests/LandlordTakeOver";
import { isLocale } from "@/i18n/config";
import { ADDRESS_COLUMNS, addressFromRow, streetLine } from "@/lib/address";
import { date, dateBeforeSuffix, money } from "@/lib/format";
import { siteHref } from "@/lib/site-href";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("invite");
  // The token is in the URL: never pass it on to another site.
  return { title: t("label"), referrer: "no-referrer", robots: { index: false } };
}

export default async function Invite({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const path = `/invite/${encodeURIComponent(token)}`;
  const t = await getTranslations("invite");
  const raw = await getLocale();
  const locale = isLocale(raw) ? raw : "hu";
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();

  if (!auth?.claims) {
    const [loginHref, registerHref] = await Promise.all([
      siteHref("portal", `/login?next=${encodeURIComponent(path)}`),
      siteHref("portal", `/register?next=${encodeURIComponent(path)}`),
    ]);
    return (
      <AuthLayout>
        <PageTitle eyebrow={t("label")}>{t("signedOut.title")}</PageTitle>
        <p className="text-[15px] text-muted">{t("signedOut.text")}</p>
        <div className="mt-auto flex flex-col gap-2.5 pt-4">
          <ButtonLink href={loginHref}>{t("signedOut.signIn")}</ButtonLink>
          <ButtonLink href={registerHref} variant="secondary">
            {t("signedOut.register")}
          </ButtonLink>
        </div>
      </AuthLayout>
    );
  }

  const { data: rows } = await supabase.rpc("invitation_preview", { p_token: token });
  const inv = rows?.[0];
  const homeHref = await siteHref("portal", "/");

  if (!inv || !inv.is_open) {
    return (
      <AuthLayout>
        <PageTitle eyebrow={t("label")}>{t("closed.title")}</PageTitle>
        <p className="text-[15px] text-muted">{t("closed.text")}</p>
        <div className="mt-auto pt-4">
          <ButtonLink href={homeHref}>{t("declined.continue")}</ButtonLink>
        </div>
      </AuthLayout>
    );
  }

  if (!inv.is_for_me) {
    return (
      <AuthLayout>
        <Notice kind="warning">{t("wrongEmail.banner", { email: inv.masked_email })}</Notice>
        <PageTitle>{t("wrongEmail.title")}</PageTitle>
        <p className="text-sm text-muted">
          {t.rich("wrongEmail.current", { email: String(auth.claims.email ?? ""), b: (chunks) => <b className="font-semibold text-ink">{chunks}</b> })}
        </p>
        <form action={signOut} className="mt-auto pt-4">
          <input type="hidden" name="site" value="portal" />
          <input type="hidden" name="next" value={path} />
          <Button>{t("wrongEmail.signOutIn")}</Button>
        </form>
      </AuthLayout>
    );
  }

  if (inv.kind === "lease_landlord") {
    const [{ data: details }, { data: memberships }] = await Promise.all([
      supabase.rpc("lease_request_preview", { p_token: token }),
      supabase
        .from("account_members")
        .select(`role, property_scope, accounts!inner(id, name, plan, archived_at, properties(id, archived_at, ${ADDRESS_COLUMNS}))`)
        .eq("user_id", auth.claims.sub)
        .in("role", ["owner", "admin", "manager"])
        .is("accounts.archived_at", null),
    ]);
    const request = details?.[0];
    if (!request) {
      return (
        <AuthLayout>
          <PageTitle eyebrow={t("label")}>{t("closed.title")}</PageTitle>
          <p className="text-[15px] text-muted">{t("closed.text")}</p>
          <div className="mt-auto pt-4">
            <ButtonLink href={homeHref}>{t("declined.continue")}</ButtonLink>
          </div>
        </AuthLayout>
      );
    }
    // Properties come back through RLS: a manager with a selected scope only sees (and may only link) those.
    const accounts: LandlordAccount[] = [];
    const properties: LandlordProperty[] = [];
    for (const m of memberships ?? []) {
      const live = m.accounts.properties.filter((p) => !p.archived_at);
      accounts.push({ id: m.accounts.id, name: m.accounts.name, plan: m.accounts.plan, propertyCount: live.length });
      for (const p of live) properties.push({ id: p.id, accountId: m.accounts.id, label: streetLine(addressFromRow(p)) });
    }
    return (
      <AuthLayout>
        <LandlordTakeOver
          token={token}
          requestId={request.request_id}
          tenantName={request.tenant_name}
          address={streetLine(addressFromRow(request))}
          proposed={{ startDate: request.start_date, endDate: request.end_date, monthlyRent: request.monthly_rent, deposit: request.deposit_amount }}
          accounts={accounts}
          properties={properties}
          validUntil={dateBeforeSuffix(inv.expires_at, locale)}
          homeHref={homeHref}
        />
      </AuthLayout>
    );
  }

  let companies: CompanyAccount[] | undefined;
  if (inv.kind === "lease_tenant") {
    const { data } = await supabase
      .from("account_members")
      .select("role, accounts!inner(id, name, kind, tax_number, archived_at)")
      .eq("user_id", auth.claims.sub)
      .in("role", ["owner", "admin"])
      .eq("accounts.kind", "company")
      .is("accounts.archived_at", null);
    companies = (data ?? []).map((m) => ({ id: m.accounts.id, name: m.accounts.name, taxNumber: m.accounts.tax_number }));
  }

  const details: [string, string][] = [];
  if (inv.property_address) details.push([t("property"), inv.property_address]);
  if (inv.monthly_rent != null) details.push([t("rent"), money(inv.monthly_rent, locale)]);
  if (inv.start_date) details.push([t("start"), date(inv.start_date, locale)]);
  if (inv.kind === "lease_tenant") details.push([t("end"), inv.end_date ? date(inv.end_date, locale) : t("openEnded")]);
  if (inv.kind === "account_member" && inv.account_role) details.push([t("role"), t(`roles.${inv.account_role}`)]);

  const intro =
    inv.kind === "lease_tenant"
      ? t("tenant.intro", { name: inv.account_name ?? inv.inviter_name ?? "" })
      : inv.kind === "lease_occupant"
        ? t("occupant.intro", { name: inv.inviter_name ?? "", role: inv.occupant_role ?? "occupant" })
        : t("member.intro", { name: inv.inviter_name ?? "", account: inv.account_name ?? "" });
  const title = inv.kind === "lease_tenant" ? t("tenant.title") : inv.kind === "lease_occupant" ? t("occupant.title") : t("member.title");

  return (
    <AuthLayout>
      <PageTitle eyebrow={t("label")}>{title}</PageTitle>
      <p className="text-sm text-muted">{intro}</p>
      {details.length > 0 && (
        <dl className="rounded-2xl border border-line bg-surface px-4 py-1">
          {details.map(([k, v], i) => (
            <div key={k} className={`flex gap-3 py-2.75 text-sm ${i ? "border-t border-line" : ""}`}>
              <dt className="w-32 flex-none text-muted">{k}</dt>
              <dd className="min-w-0 font-medium tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      <AnswerForm token={token} companies={companies} validUntil={dateBeforeSuffix(inv.expires_at, locale)} homeHref={homeHref} />
    </AuthLayout>
  );
}
