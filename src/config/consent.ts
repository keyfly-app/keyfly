/**
 * Versions of the consent texts shown to visitors. Bump the version whenever the
 * wording changes – the stored version is our proof of what someone agreed to.
 */
export const CONSENT_VERSIONS = {
  /** Privacy notice for the waitlist (public page /adatvedelem, /en/privacy). */
  waitlistPrivacy: "waitlist-privacy-2026-10-31.3",
  /** Newsletter checkbox on the coming-soon page (messages: waitlist.marketingConsent). */
  newsletter: "newsletter-2026-10-31",
  /** Keyfly Pro / Business interest checkbox for landlords and agencies (messages: waitlist.proInterest). */
  proInterest: "pro-interest-2026-10-31",
} as const;
