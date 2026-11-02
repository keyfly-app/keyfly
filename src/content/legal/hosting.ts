/**
 * Hosting provider and data processors named in the imprint and the privacy notice.
 * Update here (and bump the privacy notice version) whenever a provider changes.
 */
export const HOSTING_PROVIDER = {
  name: "Vercel Inc.",
  address: "440 N Barranca Ave #4133, Covina, CA 91723, USA",
  email: "privacy@vercel.com",
} as const;

/** Effective dates (ISO) of the current legal documents. */
export const LEGAL_EFFECTIVE = {
  privacy: "2026-10-31",
  imprint: "2026-10-31",
  terms: "2026-11-02",
  appPrivacy: "2026-11-02",
} as const;

/** Hungarian data protection authority – for the "right to complain" section. */
export const DPA = {
  name: { hu: "Nemzeti Adatvédelmi és Információszabadság Hatóság (NAIH)", en: "Hungarian National Authority for Data Protection and Freedom of Information (NAIH)" },
  address: "1055 Budapest, Falk Miksa utca 9–11.",
  postalAddress: "1363 Budapest, Pf. 9.",
  phone: "+36 1 391 1400",
  email: "ugyfelszolgalat@naih.hu",
  web: "https://naih.hu",
} as const;
