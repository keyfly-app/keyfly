import "server-only";
import { NEWSLETTER_SEGMENTS } from "@/config/newsletter";
import type { Locale } from "@/i18n/config";

const API = "https://api.resend.com";

/**
 * Adds a newsletter subscriber to Resend, in the list for their language.
 * Called only after the visitor ticked the newsletter box (explicit consent).
 * A repeated opt-in re-subscribes an existing contact and adds it to the list.
 * Never throws: a failed sync is logged and must not break the sign-up.
 */
export async function subscribeToNewsletter(email: string, locale: Locale): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return; // Not configured in this environment (local, staging, previews).

  const segment = NEWSLETTER_SEGMENTS[locale];
  const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

  try {
    const created = await fetch(`${API}/contacts`, {
      method: "POST",
      headers,
      body: JSON.stringify({ email, unsubscribed: false, segments: [{ id: segment }] }),
    });
    if (created.ok) return;

    // Existing contact: opt back in and make sure it is on the right list.
    const contact = encodeURIComponent(email);
    const updated = await fetch(`${API}/contacts/${contact}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ unsubscribed: false }),
    });
    const listed = await fetch(`${API}/contacts/${contact}/segments/${segment}`, { method: "POST", headers });
    if (!updated.ok || !listed.ok) {
      console.error("newsletter sync failed", created.status, updated.status, listed.status);
    }
  } catch (error) {
    console.error("newsletter sync failed", error instanceof Error ? error.message : "unknown error");
  }
}
