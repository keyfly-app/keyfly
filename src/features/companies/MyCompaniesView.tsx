import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/Icon";
import { Tag } from "@/components/ui/Tag";
import { accountInitials, type AccountSummary } from "./accounts";
import { CancelRequest, CompanyRowMenu } from "./MyCompaniesActions";
import { SettingsHeader } from "@/features/settings/SettingsHeader";

export type MyCompanyRow = AccountSummary & { tax: string; open: string; detailsHref: string; teamHref: string };
export type MyRequestRow = { id: string; name: string; tax_number: string | null; requested: string };

function Mark({ initials, muted = false }: { initials: string; muted?: boolean }) {
  return (
    <span aria-hidden="true" className={`flex size-9 flex-none items-center justify-center rounded-full text-xs font-semibold ${muted ? "bg-paper text-ink-soft" : "bg-brand-deep text-lime"}`}>
      {initials}
    </span>
  );
}

/** Cégeim (canvas "Cégeim"): every company account you work in, your role and its plan; your pending access requests. */
export async function MyCompaniesView({ rows, requests, addHref }: { rows: MyCompanyRow[]; requests: MyRequestRow[]; addHref: string }) {
  const [t, a, inv] = await Promise.all([getTranslations("settings.companies"), getTranslations("accounts"), getTranslations("invite")]);
  const add = (
    <Link href={addHref} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-medium text-white shadow-[0_1px_2px_rgb(12_31_25/0.16)] hover:bg-ink-soft sm:h-10">
      <Icon name="plus" size={16} strokeWidth={2} />
      {a("add")}
    </Link>
  );

  return (
    <>
      <SettingsHeader title={t("title")} lead={t("lead")} action={<div className="hidden sm:block">{add}</div>} />

      <section aria-labelledby="my-companies" className="rounded-xl border border-line bg-surface">
        <div className="flex items-baseline justify-between gap-4 px-5 pt-5 pb-3.5 sm:px-6">
          <h2 id="my-companies" className="text-[15px] font-semibold">
            {t("card")}
          </h2>
          {rows.length > 0 && <span className="text-[13px] text-muted">{t("count", { count: rows.length })}</span>}
        </div>
        {rows.length === 0 ? (
          <p className="border-t border-line px-5 py-6 text-sm text-muted sm:px-6">{t("empty")}</p>
        ) : (
          <>
            <div
              aria-hidden="true"
              className="hidden grid-cols-[minmax(0,1fr)_148px_96px_148px] border-y border-line bg-paper/60 px-6 py-2.5 text-xs font-semibold text-muted md:grid"
            >
              <span>{t("company")}</span>
              <span>{t("role")}</span>
              <span>{t("plan")}</span>
              <span />
            </div>
            <ul className="max-md:border-t max-md:border-line">
              {rows.map((r) => (
                <li
                  key={r.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-b border-line px-5 py-3.5 last:border-b-0 md:grid-cols-[minmax(0,1fr)_148px_96px_148px] md:gap-y-0 md:px-6"
                >
                  <Link href={r.open} className="group flex min-h-11 min-w-0 items-center gap-3 rounded-lg">
                    <Mark initials={accountInitials(r.name)} />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-semibold group-hover:underline">{r.name}</span>
                      <span className="truncate text-[13px] text-muted tabular-nums">
                        <span className="md:hidden">
                          {inv(`roles.${r.role}`)} · {a(`plans.${r.plan}`)}
                        </span>
                        <span className="max-md:hidden">{r.tax}</span>
                      </span>
                    </div>
                  </Link>
                  <div className="max-md:hidden">{r.role === "owner" ? <Tag tone="info">{inv("roles.owner")}</Tag> : <span className="text-sm font-medium text-ink-soft">{inv(`roles.${r.role}`)}</span>}</div>
                  <span className="text-sm text-ink-soft max-md:hidden">{a(`plans.${r.plan}`)}</span>
                  <div className="flex items-center justify-end gap-1.5">
                    <Link
                      href={r.open}
                      className="hidden h-9 items-center justify-center rounded-lg border border-field bg-surface px-3.5 text-[13px] font-medium hover:border-ink md:inline-flex"
                    >
                      {t("open")}
                    </Link>
                    <CompanyRowMenu accountId={r.id} name={r.name} detailsHref={r.detailsHref} teamHref={r.teamHref} holder={r.role === "owner"} />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {requests.length > 0 && (
        <section aria-labelledby="my-requests" className="rounded-xl border border-line bg-surface">
          <h2 id="my-requests" className="px-5 pt-5 pb-1 text-[15px] font-semibold sm:px-6">
            {t("pending")}
          </h2>
          <ul>
            {requests.map((r) => (
              <li key={r.id} className="flex flex-col gap-3 border-b border-line px-5 py-3.5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <Mark initials={accountInitials(r.name)} muted />
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">{r.name}</span>
                      <Tag tone="warning">{t("pendingTag")}</Tag>
                    </span>
                    <span className="text-[13px] text-muted tabular-nums">
                      {r.tax_number} · {t("requested", { date: r.requested })}
                    </span>
                  </div>
                </div>
                <CancelRequest requestId={r.id} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="sm:hidden [&>a]:w-full">{add}</div>
    </>
  );
}
