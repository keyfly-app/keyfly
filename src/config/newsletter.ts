import type { Locale } from "@/i18n/config";

/**
 * Newsletter lists in Resend, one per language, so each broadcast goes out in the reader's language.
 * IDs are not secret. The API key lives only in the Vercel Production environment (RESEND_API_KEY);
 * without it (local, staging, previews) sign-ups are stored but not synced.
 */
export const NEWSLETTER_SEGMENTS: Record<Locale, string> = {
  hu: "930d8c84-ae31-40e2-8069-e4f43364bce3",
  en: "913b2f9b-14fa-41af-bbd6-c85c98fc0863",
};
