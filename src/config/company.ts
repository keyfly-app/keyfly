/**
 * Single source of truth for company and brand facts.
 * Every footer, imprint, legal text, email and invoice reads from here – never hardcode these values.
 */
export const COMPANY = {
  legalName: "Plattio Magyarország Kereskedelmi Korlátolt Felelősségű Társaság",
  shortName: "Plattio Magyarország Kft.",
  registrationNumber: "01-09-351494",
  registryCourt: "Fővárosi Törvényszék Cégbírósága",
  taxNumber: "27275421-2-42",
  euVatNumber: "HU27275421",
  founded: 2019,
  address: {
    postalCode: "1061",
    city: "Budapest",
    street: "Andrássy út 5. 3. em. 8.",
    country: "HU",
  },
  /** MNB insurance-intermediary registration number – null until granted. */
  mnbRegistrationNumber: null as string | null,
} as const;

export const CONTACT = {
  support: "support@keyfly.app",
  hello: "hello@keyfly.app",
  /** Sender for transactional email (Resend, mail.keyfly.app). Replies go to support. */
  transactionalFrom: "Keyfly <noreply@mail.keyfly.app>",
  /** Sender for emails people expect from us (waitlist confirmation, news). Replies go to support. */
  updatesFrom: "Keyfly <hello@mail.keyfly.app>",
  replyTo: "support@keyfly.app",
} as const;

export const BRAND = {
  name: "Keyfly",
  domain: "keyfly.app",
  url: "https://keyfly.app",
  themeColor: "#0E5A43",
} as const;

export function formatCompanyAddress() {
  const a = COMPANY.address;
  return `${a.postalCode} ${a.city}, ${a.street}`;
}
