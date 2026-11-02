import "server-only";

/**
 * Company data from NAV through számlázz.hu ("Adózó lekérdezése", Számla Agent). Only the 8-digit tax ID goes out;
 * the answer is NAV's QueryTaxpayerResponse. Docs: https://docs.szamlazz.hu/agent/querying_taxpayer/request
 */
const ENDPOINT = "https://www.szamlazz.hu/szamla/";
const TIMEOUT_MS = 8000;

export type Taxpayer = {
  /** 12345678-2-41 */
  taxNumber: string;
  legalName: string;
  shortName: string | null;
  /** "1139 Budapest, Váci út 81." */
  address: string | null;
  /** The same address in parts, for the company details form. */
  office: { postal_code: string; city: string; street: string } | null;
};
export type TaxpayerResult = { status: "found"; taxpayer: Taxpayer } | { status: "invalid" } | { status: "unavailable" };

/** "12345678", "12345678-2-41", "12345678241" → "12345678"; anything else → null. */
export function taxId(input: string): string | null {
  const digits = input.replace(/[\s-]/g, "");
  if (!/^\d{8}(\d{3})?$/.test(digits)) return null;
  return digits.slice(0, 8);
}

const decode = (s: string) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&amp;/g, "&");

const SMALL = new Set(["és", "a", "az", "of", "and"]);
/** NAV writes names in capitals: "DUNA LAKÁSKEZELŐ KFT." → "Duna Lakáskezelő Kft." (already mixed case stays). */
export function prettyName(value: string): string {
  if (value !== value.toLocaleUpperCase("hu")) return value;
  return value
    .toLocaleLowerCase("hu")
    .split(/(\s+|-)/)
    .map((w, i) => (i > 0 && SMALL.has(w) ? w : w.charAt(0).toLocaleUpperCase("hu") + w.slice(1)))
    .join("");
}

/** First <prefix:tag>…</prefix:tag> value, namespace prefix ignored. */
function tag(xml: string, name: string): string | null {
  const m = xml.match(new RegExp(`<(?:[\\w-]+:)?${name}>([\\s\\S]*?)</(?:[\\w-]+:)?${name}>`));
  return m ? decode(m[1].trim()) : null;
}

/** Parses NAV's answer (exported for tests). */
export function parseTaxpayer(xml: string): TaxpayerResult {
  const funcCode = tag(xml, "funcCode");
  if (funcCode !== "OK") return { status: "unavailable" };
  if (tag(xml, "taxpayerValidity") !== "true") return { status: "invalid" };
  const legalName = tag(xml, "taxpayerName");
  const id = tag(xml, "taxpayerId");
  const vat = tag(xml, "vatCode");
  const county = tag(xml, "countyCode");
  if (!legalName || !id) return { status: "invalid" };
  // The registered office (HQ) when listed, else the first address.
  const items = xml.match(/<(?:[\w-]+:)?taxpayerAddressItem>[\s\S]*?<\/(?:[\w-]+:)?taxpayerAddressItem>/g) ?? [];
  const hq = items.find((i) => tag(i, "taxpayerAddressType") === "HQ") ?? items[0];
  let address: string | null = null;
  let office: Taxpayer["office"] = null;
  if (hq) {
    const category = tag(hq, "publicPlaceCategory")?.toLocaleLowerCase("hu");
    const streetName = tag(hq, "streetName");
    const street = [streetName && prettyName(streetName), category, tag(hq, "number")].filter(Boolean).join(" ");
    const unit = [tag(hq, "building"), tag(hq, "staircase"), tag(hq, "floor"), tag(hq, "door")].filter(Boolean).join(" ");
    const cityName = tag(hq, "city");
    const city = [tag(hq, "postalCode"), cityName && prettyName(cityName)].filter(Boolean).join(" ");
    const line = [street, unit].filter(Boolean).join(" ");
    address = [city, line].filter(Boolean).join(", ") || null;
    if (address && /\d$/.test(address)) address += ".";
    const postal = tag(hq, "postalCode");
    if (postal && cityName && line) office = { postal_code: postal, city: prettyName(cityName), street: /\d$/.test(line) ? `${line}.` : line };
  }
  return {
    status: "found",
    taxpayer: {
      taxNumber: vat && county ? `${id}-${vat}-${county}` : id,
      legalName: prettyName(legalName),
      shortName: (() => {
        const short = tag(xml, "taxpayerShortName");
        return short ? prettyName(short) : null;
      })(),
      address,
      office,
    },
  };
}

export async function queryTaxpayer(tax8: string): Promise<TaxpayerResult> {
  const key = process.env.SZAMLAZZ_AGENT_KEY;
  if (!key || !/^\d{8}$/.test(tax8)) return { status: "unavailable" };
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<xmltaxpayer xmlns="http://www.szamlazz.hu/xmltaxpayer" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">` +
    `<beallitasok><szamlaagentkulcs>${key.replace(/[<>&]/g, "")}</szamlaagentkulcs></beallitasok><torzsszam>${tax8}</torzsszam></xmltaxpayer>`;
  const form = new FormData();
  form.set("action-szamla_agent_taxpayer", new Blob([xml], { type: "text/xml" }), "taxpayer.xml");
  try {
    const res = await fetch(ENDPOINT, { method: "POST", body: form, signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
    const body = await res.text();
    if (!res.ok) {
      console.error("taxpayer query failed", res.status, res.headers.get("szlahu_error_code"));
      return { status: "unavailable" };
    }
    const result = parseTaxpayer(body);
    if (result.status === "unavailable") console.error("taxpayer query error", tag(body, "errorCode"), res.headers.get("szlahu_error_code"));
    return result;
  } catch (e) {
    console.error("taxpayer query unreachable", e instanceof Error ? e.name : "error");
    return { status: "unavailable" };
  }
}
