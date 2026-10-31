import { getTranslations } from "next-intl/server";
import { BRAND, COMPANY, CONTACT } from "@/config/company";
import { publicHref, type Locale } from "@/i18n/config";
import { FAQ_QUESTIONS, faqValues } from "./FaqSection";

/** schema.org data for search engines: who runs Keyfly, the website itself, and the FAQ on the home page. */
export async function StructuredData({ locale }: { locale: Locale }) {
  const t = await getTranslations("comingSoon.faq");
  const meta = await getTranslations("meta");
  const values = faqValues(locale);
  const organization = `${BRAND.url}/#organization`;

  const graph = [
    {
      "@type": "Organization",
      "@id": organization,
      name: BRAND.name,
      legalName: COMPANY.legalName,
      url: BRAND.url,
      logo: `${BRAND.url}/apple-touch-icon.png`,
      email: CONTACT.hello,
      vatID: COMPANY.euVatNumber,
      address: {
        "@type": "PostalAddress",
        streetAddress: COMPANY.address.street,
        postalCode: COMPANY.address.postalCode,
        addressLocality: COMPANY.address.city,
        addressCountry: COMPANY.address.country,
      },
    },
    {
      "@type": "WebSite",
      "@id": `${BRAND.url}/#website`,
      name: BRAND.name,
      url: BRAND.url,
      description: meta("description"),
      inLanguage: locale,
      publisher: { "@id": organization },
    },
    {
      "@type": "FAQPage",
      url: `${BRAND.url}${publicHref("home", locale)}`,
      inLanguage: locale,
      mainEntity: FAQ_QUESTIONS.map((key) => ({
        "@type": "Question",
        name: t(`items.${key}.q`),
        acceptedAnswer: { "@type": "Answer", text: t(`items.${key}.a`, values) },
      })),
    },
  ];

  const json = JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
