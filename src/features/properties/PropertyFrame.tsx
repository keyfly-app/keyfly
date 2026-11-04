import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Shell } from "@/components/Shell";
import { Icon } from "@/components/Icon";
import { ButtonLink } from "@/components/ui/form";
import { Tag } from "@/components/ui/Tag";
import { loadCatalog } from "@/features/catalog/load";
import { companyBySlug, myAccounts } from "@/features/companies/accounts";
import { isLocale, type Locale } from "@/i18n/config";
import { addressFromRow } from "@/lib/address";
import { siteHref } from "@/lib/site-href";
import { addressLine, displayName, shortDate } from "./format";
import { CopyCode, CreatedToast, PropertyMenu } from "./HeaderActions";
import { kindIcon, kindLabel } from "./kinds";
import { canEditProperties, propertyByCode } from "./load";
import { STATUS_TONE } from "./PropertiesPage";

export type PropertyTab = "overview" | "leases" | "data";

/** Everything a property page needs: the account (personal or /c/<slug>), the property by its Keyfly ID, the types. */
export async function propertyContext(slug: string | undefined, code: string) {
  const account = slug ? await companyBySlug(slug) : ((await myAccounts()).find((a) => a.kind === "person") ?? null);
  if (!account) notFound();
  const property = await propertyByCode(account.id, decodeURIComponent(code).toUpperCase());
  if (!property) notFound();
  const [catalog, raw] = await Promise.all([
    loadCatalog("property_type", "heating", "energy_rating", "parking", "furnishing", "outdoor_kind", "property_extra"),
    getLocale(),
  ]);
  const locale: Locale = isLocale(raw) ? raw : "hu";
  const base = slug ? `/c/${slug}` : "";
  const root = `${base}/properties/${property.public_code}`;
  return {
    account,
    property,
    catalog,
    locale,
    base,
    root,
    editable: canEditProperties(account.role),
  };
}
export type PropertyContext = Awaited<ReturnType<typeof propertyContext>>;

/** Page title for a property tab: "Duna-parti lakás". */
export async function propertyTitle(slug: string | undefined, code: string): Promise<string> {
  const account = slug ? await companyBySlug(slug) : ((await myAccounts()).find((a) => a.kind === "person") ?? null);
  const p = account ? await propertyByCode(account.id, decodeURIComponent(code).toUpperCase()) : null;
  return p ? displayName(p.label, addressFromRow(p)) : "";
}

/**
 * The frame of a property's pages (canvas "Ingatlan – áttekintés", mobile "… – mobil"): back to the list, photo or type
 * tile, name with its state, address, Keyfly ID and own ID; Edit and the ⋯ menu; the tabs that work today.
 */
export async function PropertyFrame({
  ctx,
  tab,
  created = false,
  children,
}: {
  ctx: PropertyContext;
  tab: PropertyTab;
  created?: boolean;
  children: React.ReactNode;
}) {
  const { account, property: p, catalog, locale, root, editable } = ctx;
  const [t, list] = await Promise.all([getTranslations("properties"), getTranslations("properties.detail")]);
  const a = addressFromRow(p);
  const o = p.occupancy;
  const status = o.state === "ending" ? t("status.ending", { date: shortDate(o.end, locale) }) : t(`status.${o.state}`);
  const [listHref, overviewHref, leasesHref, dataHref, editHref] = await Promise.all([
    siteHref("portal", `${ctx.base}/properties`),
    siteHref("portal", root),
    siteHref("portal", `${root}/leases`),
    siteHref("portal", `${root}/data`),
    siteHref("portal", `${root}/data?edit=identity`),
  ]);
  const leaseCount = p.leases.length;
  const tabs: {
    key: PropertyTab;
    href: string;
    label: string;
    count?: number;
  }[] = [
    { key: "overview", href: overviewHref, label: list("tabs.overview") },
    {
      key: "leases",
      href: leasesHref,
      label: list("tabs.leases"),
      count: leaseCount || undefined,
    },
    { key: "data", href: dataHref, label: list("tabs.data") },
  ];

  return (
    <Shell account={account.kind === "company" ? account : undefined}>
      {created && <CreatedToast />}
      <div className="flex flex-col gap-5">
        <Link href={listHref} className="-my-2 inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-medium text-ink-soft hover:text-ink">
          <Icon name="back" size={16} strokeWidth={2} />
          {list("back")}
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span aria-hidden="true" className="flex size-14 flex-none items-center justify-center rounded-xl bg-mist text-brand sm:size-[72px]">
              <Icon name={kindIcon(catalog.property_type, p.kind)} size={26} strokeWidth={1.6} />
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h1 className="font-display text-[22px] leading-7 font-semibold [overflow-wrap:anywhere] sm:text-[26px] sm:leading-8">
                  {displayName(p.label, a)}
                </h1>
                <span className="flex">
                  <Tag tone={STATUS_TONE[o.state]}>{status}</Tag>
                </span>
              </div>
              <p className="text-sm text-muted [overflow-wrap:anywhere]">
                {addressLine(a)} · {kindLabel(catalog.property_type, p.kind, p.other_kind_label)}
              </p>
              <p className="flex flex-wrap items-center gap-x-2 text-[12.5px] text-muted">
                <CopyCode code={p.public_code} />
                {p.own_ref && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>
                      {t("ownRef")} <span className="font-mono font-semibold tracking-[0.04em] text-ink">{p.own_ref}</span>
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
          {editable && (
            <div className="flex flex-none items-center gap-2">
              <ButtonLink href={editHref} variant="secondary" fit>
                <Icon name="edit" size={15} strokeWidth={2} />
                {list("edit")}
              </ButtonLink>
              <PropertyMenu propertyId={p.id} accountId={account.id} listHref={listHref} />
            </div>
          )}
        </div>
        <nav aria-label={list("tabsLabel")} className="-mx-4 overflow-x-auto border-b border-line px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
          <ul className="flex gap-6">
            {tabs.map((x) => (
              <li key={x.key} className="flex-none">
                <Link
                  href={x.href}
                  aria-current={x.key === tab ? "page" : undefined}
                  className="-mb-px flex min-h-11 items-center gap-1.5 border-b-2 border-transparent text-sm font-medium whitespace-nowrap text-ink-soft hover:text-ink aria-[current=page]:border-ink aria-[current=page]:font-semibold aria-[current=page]:text-ink"
                >
                  {x.label}
                  {x.count != null && <span className="text-xs text-muted tabular-nums">{x.count}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        {children}
      </div>
    </Shell>
  );
}
