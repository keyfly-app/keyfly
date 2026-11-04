import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Icon } from "@/components/Icon";
import { ButtonLink } from "@/components/ui/form";
import { Tag, type TagTone } from "@/components/ui/Tag";
import { loadCatalog } from "@/features/catalog/load";
import type { AccountSummary } from "@/features/companies/accounts";
import { isLocale, type Locale } from "@/i18n/config";
import { addressFromRow } from "@/lib/address";
import { money } from "@/lib/format";
import { siteHref } from "@/lib/site-href";
import { addressLine, displayName, shortDate, sizeText } from "./format";
import { kindIcon, kindLabel } from "./kinds";
import { canEditProperties, propertyList, type Occupancy, type PropertyListRow } from "./load";

const FILTERS = ["all", "let", "vacant"] as const;
type Filter = (typeof FILTERS)[number];
export const readPropertyFilter = (raw: string | undefined): Filter => FILTERS.find((f) => f === raw) ?? "all";

export const STATUS_TONE: Record<Occupancy["state"], TagTone> = {
  let: "ok",
  ending: "warning",
  progress: "info",
  vacant: "neutral",
};
const isLet = (o: Occupancy) => o.state === "let" || o.state === "ending";
const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

type Row = {
  p: PropertyListRow;
  href: string;
  name: string;
  address: string;
  type: string;
  icon: ReturnType<typeof kindIcon>;
  size: string;
  status: string;
  tenant: string;
  rent: string;
};

/**
 * "Ingatlanok" (canvas "Ingatlanok – lista", "… üres", mobile "Ingatlanok – mobil lista"): the account's properties with
 * their state; filter by a link (works without JavaScript) and search by name, address or ID. Table from 1024 px, cards below.
 */
export async function PropertiesPage({ account, base, filter, query }: { account: AccountSummary; base: string; filter: Filter; query: string }) {
  const [t, all, { property_type: types }, raw] = await Promise.all([
    getTranslations("properties"),
    propertyList(account.id),
    loadCatalog("property_type"),
    getLocale(),
  ]);
  const locale: Locale = isLocale(raw) ? raw : "hu";
  const [listHref, newHref, importHref, it] = await Promise.all([
    siteHref("portal", `${base}/properties`),
    siteHref("portal", `${base}/properties/new`),
    siteHref("portal", `${base}/properties/import`),
    getTranslations("properties.import"),
  ]);
  const canAdd = canEditProperties(account.role);
  const letCount = all.filter((p) => isLet(p.occupancy)).length;

  const header = (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[22px] leading-7 font-semibold sm:text-[26px] sm:leading-8">{t("title")}</h1>
        {all.length > 0 && (
          <p className="text-sm text-muted">
            {t("summary", {
              count: all.length,
              let: letCount,
              vacant: all.length - letCount,
            })}
          </p>
        )}
      </div>
      {/* Phones and tablets add from the bottom bar's "+". */}
      {canAdd && all.length > 0 && (
        <div className="hidden gap-2 lg:flex">
          <ButtonLink href={importHref} variant="secondary" fit>
            <Icon name="upload" size={16} strokeWidth={2} />
            {it("entry")}
          </ButtonLink>
          <ButtonLink href={newHref} fit>
            <Icon name="plus" size={16} strokeWidth={2} />
            {t("add")}
          </ButtonLink>
        </div>
      )}
    </div>
  );

  if (all.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <div className="flex flex-col items-center gap-1.5 rounded-xl border border-line bg-surface px-5 py-12 text-center">
          <span aria-hidden="true" className="mb-3 flex size-14 items-center justify-center rounded-xl bg-mist text-brand">
            <Icon name="home" size={24} strokeWidth={1.75} />
          </span>
          <h2 className="text-[15px] font-semibold">{t("empty.title")}</h2>
          <p className="text-sm text-muted">{t("empty.lead")}</p>
          {canAdd && (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <ButtonLink href={newHref} fit>
                <Icon name="plus" size={16} strokeWidth={2} />
                {t("add")}
              </ButtonLink>
              {/* Importing works on a computer. */}
              <span className="hidden lg:block">
                <ButtonLink href={importHref} variant="secondary" fit>
                  <Icon name="upload" size={16} strokeWidth={2} />
                  {it("entry")}
                </ButtonLink>
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  const q = fold(query.trim());
  const shown = all
    .filter((p) => filter === "all" || (filter === "let" ? isLet(p.occupancy) : !isLet(p.occupancy)))
    .filter((p) => {
      if (!q) return true;
      const a = addressFromRow(p);
      return [displayName(p.label, a), addressLine(a), p.public_code, p.own_ref ?? ""].some((s) => fold(s).includes(q));
    });
  const rows: Row[] = await Promise.all(
    shown.map(async (p) => {
      const a = addressFromRow(p);
      const o = p.occupancy;
      return {
        p,
        href: await siteHref("portal", `${base}/properties/${p.public_code}`),
        name: displayName(p.label, a),
        address: addressLine(a),
        type: kindLabel(types, p.kind, p.other_kind_label),
        icon: kindIcon(types, p.kind),
        size: sizeText(t, locale, p),
        status: o.state === "ending" ? t("status.ending", { date: shortDate(o.end, locale) }) : t(`status.${o.state}`),
        tenant: o.state === "vacant" ? "" : (o.tenant ?? ""),
        rent: o.state === "vacant" ? "" : money(o.rent, locale),
      };
    }),
  );
  const counts: Record<Filter, number> = {
    all: all.length,
    let: letCount,
    vacant: all.length - letCount,
  };
  const linkFor = (f: Filter) => {
    const params = new URLSearchParams();
    if (f !== "all") params.set("filter", f);
    if (query.trim()) params.set("q", query.trim());
    const s = params.toString();
    return s ? `${listHref}?${s}` : listHref;
  };

  return (
    <div className="flex flex-col gap-6">
      {header}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label={t("filters.label")} className="flex rounded-lg bg-mist p-0.5 lg:w-[330px]">
          {FILTERS.map((f) => (
            <Link
              key={f}
              href={linkFor(f)}
              aria-current={f === filter ? "page" : undefined}
              className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-md px-2 text-[13px] font-medium text-ink-soft aria-[current=page]:bg-surface aria-[current=page]:font-semibold aria-[current=page]:text-ink aria-[current=page]:shadow-[0_1px_2px_rgb(12_31_25/0.12)] sm:min-h-9"
            >
              {t(`filters.${f}`)}
              <span className="tabular-nums">{counts[f]}</span>
            </Link>
          ))}
        </nav>
        <form role="search" action={listHref} className="relative lg:w-[340px]">
          {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
          <label htmlFor="property-search" className="sr-only">
            {t("search.label")}
          </label>
          <Icon name="search" size={17} strokeWidth={1.75} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input
            id="property-search"
            type="search"
            name="q"
            defaultValue={query}
            placeholder={t("search.placeholder")}
            maxLength={80}
            className="h-11 w-full min-w-0 rounded-lg border border-field bg-surface pr-3 pl-10 text-base placeholder:text-muted/80 focus:border-brand focus:shadow-[0_0_0_3px_rgb(14_90_67/0.16)] focus-visible:outline-none sm:h-10 sm:text-sm"
          />
        </form>
      </div>

      {rows.length === 0 ? (
        <p role="status" className="rounded-xl border border-dashed border-field bg-surface p-5 text-sm text-muted">
          {t("noMatch")}
        </p>
      ) : (
        <>
          <PropertyCards rows={rows} t={t} className="lg:hidden" />
          <PropertyTable rows={rows} t={t} className="hidden lg:block" />
        </>
      )}
    </div>
  );
}

type Tr = Awaited<ReturnType<typeof getTranslations<"properties">>>;

/** The cover photo, or the type's icon on a mist tile. */
function KindTile({ icon, url, size = 40 }: { icon: Row["icon"]; url: string | null; size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className="flex flex-none items-center justify-center overflow-hidden rounded-lg bg-mist text-brand"
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- signed links to the private bucket change every hour
        <img src={url} alt="" className="size-full object-cover" />
      ) : (
        <Icon name={icon} size={18} strokeWidth={1.75} />
      )}
    </span>
  );
}

function PropertyTable({ rows, t, className }: { rows: Row[]; t: Tr; className: string }) {
  const cols = [t("columns.property"), t("columns.type"), t("columns.size"), t("columns.status"), t("columns.tenant")];
  return (
    <div className={`rounded-xl border border-line bg-surface px-2 pt-1 pb-2 ${className}`}>
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">{t("title")}</caption>
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c} scope="col" className="border-b border-line px-3 py-3 text-xs font-semibold text-muted">
                {c}
              </th>
            ))}
            <th scope="col" className="border-b border-line px-3 py-3 text-right text-xs font-semibold text-muted">
              {t("columns.rent")}
            </th>
            <td className="w-8 border-b border-line" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.p.id} className="relative hover:bg-paper">
              <td className="border-b border-paper px-3 py-3">
                <span className="flex items-center gap-3">
                  <KindTile icon={r.icon} url={r.p.coverUrl} />
                  <span className="flex min-w-0 flex-col">
                    <Link
                      href={r.href}
                      className="rounded-sm text-sm font-semibold [overflow-wrap:anywhere] after:absolute after:inset-0 focus-visible:outline-3 focus-visible:outline-brand"
                    >
                      {r.name}
                    </Link>
                    <span className="text-[12.5px] leading-[17px] text-muted [overflow-wrap:anywhere]">
                      {r.address}
                      {r.p.own_ref && ` · ${r.p.own_ref}`}
                    </span>
                  </span>
                </span>
              </td>
              <td className="border-b border-paper px-3 py-3 text-[13.5px]">{r.type}</td>
              <td className="border-b border-paper px-3 py-3 text-[13.5px] whitespace-nowrap tabular-nums">{r.size || "–"}</td>
              <td className="border-b border-paper px-3 py-3">
                <Tag tone={STATUS_TONE[r.p.occupancy.state]}>{r.status}</Tag>
              </td>
              <td className="border-b border-paper px-3 py-3 text-[13.5px]">{r.tenant || "–"}</td>
              <td className="border-b border-paper px-3 py-3 text-right text-[13.5px] font-semibold whitespace-nowrap tabular-nums">{r.rent || "–"}</td>
              <td className="border-b border-paper py-3 pr-2 text-muted">
                <Icon name="chevronRight" size={16} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PropertyCards({ rows, t, className }: { rows: Row[]; t: Tr; className: string }) {
  return (
    <ul className={`flex flex-col gap-2.5 ${className}`}>
      {rows.map((r) => (
        <li key={r.p.id}>
          <Link
            href={r.href}
            aria-label={t("open", { name: r.name })}
            className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 transition-colors hover:border-field motion-reduce:transition-none"
          >
            <span className="flex items-start gap-3">
              <KindTile icon={r.icon} url={r.p.coverUrl} size={44} />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[15px] leading-[21px] font-semibold [overflow-wrap:anywhere]">{r.name}</span>
                <span className="text-[13px] leading-[18px] text-muted [overflow-wrap:anywhere]">{r.address}</span>
              </span>
            </span>
            <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <Tag tone={STATUS_TONE[r.p.occupancy.state]}>{r.status}</Tag>
              {r.tenant && <span className="text-[13.5px]">{r.tenant}</span>}
            </span>
            <span className="flex items-center justify-between gap-3 border-t border-paper pt-3 text-[13px]">
              <span className="min-w-0 text-muted">{[r.type, r.size].filter(Boolean).join(" · ")}</span>
              {r.rent && <span className="flex-none font-semibold tabular-nums">{r.rent}</span>}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
