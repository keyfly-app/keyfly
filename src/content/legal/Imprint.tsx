import { COMPANY, CONTACT, formatCompanyAddress } from "@/config/company";
import type { Locale } from "@/i18n/config";
import { HOSTING_PROVIDER } from "./hosting";

/** Imprint (Ektv. 4. §). Hungarian is binding; English is an informative translation. */
export function ImprintContent({ locale }: { locale: Locale }) {
  const hu = locale === "hu";
  const rows: [string, React.ReactNode][] = hu
    ? [
        ["Szolgáltató neve", COMPANY.legalName],
        ["Rövidített név", COMPANY.shortName],
        ["Székhely", formatCompanyAddress()],
        ["Cégjegyzékszám", `${COMPANY.registrationNumber} (${COMPANY.registryCourt})`],
        ["Adószám", COMPANY.taxNumber],
        ["Közösségi adószám", COMPANY.euVatNumber],
        ["E-mail", <a key="e" href={`mailto:${CONTACT.hello}`}>{CONTACT.hello}</a>],
        ["Ügyfélszolgálat", <a key="s" href={`mailto:${CONTACT.support}`}>{CONTACT.support}</a>],
      ]
    : [
        ["Service provider", COMPANY.legalName],
        ["Short name", COMPANY.shortName],
        ["Registered office", formatCompanyAddress()],
        ["Company registration number", `${COMPANY.registrationNumber} (${COMPANY.registryCourt})`],
        ["Tax number", COMPANY.taxNumber],
        ["EU VAT number", COMPANY.euVatNumber],
        ["Email", <a key="e" href={`mailto:${CONTACT.hello}`}>{CONTACT.hello}</a>],
        ["Customer support", <a key="s" href={`mailto:${CONTACT.support}`}>{CONTACT.support}</a>],
      ];

  return (
    <>
      <p>
        {hu
          ? "A keyfly.app weboldalt és a Keyfly szolgáltatást a Plattio Magyarország Kft. üzemelteti."
          : "The keyfly.app website and the Keyfly service are operated by Plattio Magyarország Kft."}
      </p>
      <h2>{hu ? "Szolgáltató" : "Service provider"}</h2>
      <dl>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <h2>{hu ? "Tárhelyszolgáltató" : "Hosting provider"}</h2>
      <dl>
        <dt>{HOSTING_PROVIDER.name}</dt>
        <dd>
          {HOSTING_PROVIDER.address} · <a href={`mailto:${HOSTING_PROVIDER.email}`}>{HOSTING_PROVIDER.email}</a>
        </dd>
      </dl>
    </>
  );
}
