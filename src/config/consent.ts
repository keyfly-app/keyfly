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
  /**
   * Customer app sign-up (messages: register.terms). Drafts on staging: the general terms (ÁSZF) and the
   * app privacy notice must be published, and these versions set to them, before production.
   */
  accountTerms: "terms-draft-2026-11-02",
  accountPrivacy: "account-privacy-draft-2026-11-02",
} as const;
