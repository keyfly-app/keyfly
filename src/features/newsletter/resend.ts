import "server-only";
import { NEWSLETTER_SEGMENTS } from "@/config/newsletter";
import type { Locale } from "@/i18n/config";
import { resendFetch } from "@/lib/resend";

/**
 * Adds a newsletter subscriber to Resend, in the list for their language.
 * Called only after the visitor ticked the newsletter box (explicit consent).
 * A repeated opt-in re-subscribes an existing contact and adds it to the list.
 * Never throws: a failed sync is logged and must not break the sign-up.
 */
export async function subscribeToNewsletter(email: string, locale: Locale): Promise<void> {
  const segment = NEWSLETTER_SEGMENTS[locale];
  try {
    const created = await resendFetch("/contacts", {
      method: "POST",
      body: { email, unsubscribed: false, segments: [{ id: segment }] },
    });
    if (!created || created.ok) return;

    // Existing contact: opt back in and make sure it is on the right list.
    const contact = encodeURIComponent(email);
    const updated = await resendFetch(`/contacts/${contact}`, { method: "PATCH", body: { unsubscribed: false } });
    const listed = await resendFetch(`/contacts/${contact}/segments/${segment}`, { method: "POST" });
    if (!updated?.ok || !listed?.ok) {
      console.error("newsletter sync failed", created.status, updated?.status, listed?.status);
    }
  } catch (error) {
    console.error("newsletter sync failed", error instanceof Error ? error.message : "unknown error");
  }
}
