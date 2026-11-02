import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Icon, type IconName } from "@/components/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { signOut } from "@/features/auth/actions";
import { accountInitials } from "@/features/companies/accounts";
import { currentUser } from "@/features/settings/current-user";
import { personalSettingsLinks } from "@/features/settings/links";
import { SetupGuide, type GuideStep } from "@/features/settings/SetupGuide";
import { settingsSummary, type CompanySummary } from "@/features/settings/summary";
import { siteHref } from "@/lib/site-href";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings");
  return { title: t("title"), robots: { index: false } };
}

type Row = { icon: IconName; label: string; value: string | null; badge?: string | null; href: string; readOnly?: boolean };

/** One item: its value and a chevron (the whole row opens it), or "—" and a quiet "Hozzáadás" – never a warning. */
function SummaryRow({ row, add }: { row: Row; add: string }) {
  const empty = !row.value;
  const body = (
    <>
      <span aria-hidden="true" className="hidden size-9 flex-none items-center justify-center rounded-[10px] bg-paper text-ink-soft sm:flex">
        <Icon name={row.icon} size={17} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-px">
        <span className="text-[13px] leading-[18px] font-medium text-muted">{row.label}</span>
        {empty ? (
          <span className="text-sm text-muted" aria-hidden="true">
            —
          </span>
        ) : (
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="min-w-0 truncate text-sm font-medium">{row.value}</span>
            {row.badge && (
              <span className="inline-flex items-center gap-1 text-[12.5px] font-medium text-ok-ink">
                <Icon name="check" size={13} strokeWidth={2.5} />
                {row.badge}
              </span>
            )}
          </span>
        )}
      </span>
      {empty && !row.readOnly ? (
        <span className="flex-none text-sm font-semibold text-brand">{add}</span>
      ) : (
        !row.readOnly && <Icon name="chevronRight" size={16} className="flex-none text-muted" />
      )}
    </>
  );
  const cls = "flex min-h-16 items-center gap-3.5 border-t border-line px-4 py-3 sm:px-5";
  if (row.readOnly) return <li className={cls}>{body}</li>;
  return (
    <li>
      <Link href={row.href} aria-label={empty ? `${row.label}: ${add}` : undefined} className={`${cls} hover:bg-paper`}>
        {body}
      </Link>
    </li>
  );
}

function OwnerHead({ mark, name, sub }: { mark: React.ReactNode; name: string; sub: string }) {
  return (
    <div className="flex items-center gap-3.5 px-4 py-4 sm:px-5">
      {mark}
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-[15px] font-semibold">{name}</span>
        <span className="truncate text-[13px] text-muted">{sub}</span>
      </span>
    </div>
  );
}

const CompanyMark = ({ name }: { name: string }) => (
  <span aria-hidden="true" className="flex size-10 flex-none items-center justify-center rounded-full bg-brand-deep text-sm font-semibold text-lime">
    {accountInitials(name)}
  </span>
);

const complete = (c: CompanySummary) => Boolean(c.tax && c.office && c.contactEmail && c.contactPhone && c.bank);

/**
 * Beállítások → Összefoglaló (canvas v2.4 "Beállítások – áttekintés"): the few setup steps, then your personal and
 * your company details apart but on one page; on phones also the menu of the personal pages and signing out.
 */
export default async function SettingsSummary() {
  const [t, roles, nav, user, summary, personalLinks] = await Promise.all([
    getTranslations("settings.summary"),
    getTranslations("invite.roles"),
    getTranslations("settings.nav"),
    currentUser(),
    settingsSummary(),
    personalSettingsLinks(),
  ]);
  if (!user || !summary) notFound();
  const common = await getTranslations("common");
  const href = (path: string) => siteHref("portal", path);
  const [profile, security, bank, twoStepSetup, addCompany] = await Promise.all([
    href("/settings/profile"),
    href("/settings/security"),
    href("/settings/bank"),
    href("/security/two-step"),
    href("/companies/new"),
  ]);
  const { me } = summary;

  const personalRows: Row[] = [
    { icon: "user", label: t("name"), value: me.name, href: profile },
    { icon: "phone", label: t("phone"), value: me.phone, badge: me.phoneVerified ? t("confirmed") : null, href: profile },
    { icon: "home", label: t("home"), value: me.home, href: `${profile}#addresses` },
    { icon: "mail", label: t("mailing"), value: me.mailing ?? (me.mailingSame ? t("mailingSame") : null), href: `${profile}#addresses` },
    { icon: "bank", label: t("bank"), value: me.bank, href: me.bank ? bank : `${bank}?add` },
    { icon: "lock", label: t("twoStep"), value: me.twoStep ? t("on") : t("off"), href: security },
  ];

  const companyCards = await Promise.all(
    summary.companies.map(async (c) => {
      const [details, bankHref, team] = await Promise.all([href(`/c/${c.slug}/settings/company`), href(`/c/${c.slug}/settings/bank`), href(`/c/${c.slug}/settings/team`)]);
      const readOnly = !c.manage;
      const rows: Row[] = [
        { icon: "building", label: t("details"), value: c.tax ? `${c.name} · ${c.tax}` : null, badge: c.navVerified ? t("navChecked") : null, href: details, readOnly: readOnly && !c.tax },
        { icon: "pin", label: t("office"), value: c.office, href: details, readOnly: readOnly && !c.office },
        { icon: "mail", label: t("contactEmail"), value: c.contactEmail, href: details, readOnly: readOnly && !c.contactEmail },
        { icon: "phone", label: t("contactPhone"), value: c.contactPhone, href: details, readOnly: readOnly && !c.contactPhone },
        { icon: "bank", label: t("bank"), value: c.bank, href: c.bank || readOnly ? bankHref : `${bankHref}?add`, readOnly: readOnly && !c.bank },
        { icon: "users", label: t("team"), value: t("members", { count: c.members }), href: team },
      ];
      return { c, rows, details };
    }),
  );

  const steps: GuideStep[] = await Promise.all(
    summary.steps.map(async (s, i): Promise<GuideStep> => {
      const sub = s.company ?? t("guide.personal");
      const action =
        s.key === "phone"
          ? { href: profile, label: t("guide.actions.phone") }
          : s.key === "twoStep"
            ? { href: twoStepSetup, label: t("guide.actions.twoStep") }
            : s.key === "nav"
              ? { href: await href(`/c/${s.slug}/settings/company`), label: t("guide.actions.nav") }
              : { href: await href(`/c/${s.slug}/settings/bank?add`), label: t("guide.actions.bank") };
      return { id: `${s.key}-${s.slug ?? i}`, title: t(`guide.steps.${s.key}`), sub, done: s.done, action };
    }),
  );
  const done = steps.filter((s) => s.done).length;

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[22px] leading-7 font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted">{t("lead")}</p>
      </div>

      <SetupGuide title={t("guide.title")} hide={t("guide.hide")} doneLabel={t("guide.done")} progressLabel={t("guide.progress", { done, total: steps.length })} steps={steps} />

      <section aria-labelledby="summary-personal" className="flex flex-col gap-2.5">
        <h2 id="summary-personal" className="text-xs font-semibold text-muted">
          {nav("personal")}
        </h2>
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          <OwnerHead mark={<Avatar src={user.avatarUrl} initials={user.initials} size={40} />} name={user.fullName ?? user.email} sub={t("personalSub")} />
          <ul>
            {personalRows.map((r) => (
              <SummaryRow key={r.label} row={r} add={t("add")} />
            ))}
          </ul>
        </div>
      </section>

      {companyCards.length > 0 && (
        <section aria-labelledby="summary-companies" className="flex flex-col gap-2.5">
          <h2 id="summary-companies" className="text-xs font-semibold text-muted">
            {nav("companies")}
          </h2>
          <div className="flex flex-col gap-4">
            {companyCards.map(({ c, rows, details }) =>
              complete(c) ? (
                <Link key={c.id} href={details} className="flex items-center gap-3.5 rounded-xl border border-line bg-surface px-4 py-4 hover:bg-paper sm:px-5">
                  <CompanyMark name={c.name} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[15px] font-semibold">{c.name}</span>
                    <span className="truncate text-[13px] text-muted">{t("companySub", { role: roles(c.role) })}</span>
                  </span>
                  <Icon name="chevronRight" size={16} className="flex-none text-muted" />
                </Link>
              ) : (
                <div key={c.id} className="overflow-hidden rounded-xl border border-line bg-surface">
                  <OwnerHead mark={<CompanyMark name={c.name} />} name={c.name} sub={t("companySub", { role: roles(c.role) })} />
                  <ul>
                    {rows.map((r) => (
                      <SummaryRow key={r.label} row={r} add={t("add")} />
                    ))}
                  </ul>
                </div>
              ),
            )}
          </div>
        </section>
      )}

      {/* Phones: this page is also the settings menu. */}
      <div className="flex flex-col gap-4 lg:hidden">
        <Link href={addCompany} className="inline-flex min-h-11 items-center gap-2 self-start text-sm font-semibold text-brand">
          <Icon name="plus" size={16} strokeWidth={2} />
          {t("addCompany")}
        </Link>
        <nav aria-label={nav("label")}>
          <ul className="overflow-hidden rounded-xl border border-line bg-surface">
            {personalLinks.map((l, i) => (
              <li key={l.href} className={i ? "border-t border-line" : ""}>
                <Link href={l.href} className="flex min-h-[52px] items-center gap-3 px-4 hover:bg-paper">
                  {l.icon && <Icon name={l.icon} size={18} className="flex-none text-ink-soft" />}
                  <span className="flex-1 text-[15px] font-medium">{l.label}</span>
                  <Icon name="chevronRight" size={16} className="text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <form action={signOut}>
          <input type="hidden" name="site" value="portal" />
          <button type="submit" className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-field bg-surface text-sm font-medium">
            <Icon name="logout" size={16} />
            {common("signOut")}
          </button>
        </form>
      </div>
    </>
  );
}
