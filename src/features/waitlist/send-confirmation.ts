import "server-only";
import { CONTACT } from "@/config/company";
import type { Locale } from "@/i18n/config";
import type { Enums } from "@/lib/supabase/database.types";
import { resendFetch } from "@/lib/resend";
import { waitlistConfirmationEmail } from "./confirmation-email";

/** Sends the branded "you're on the waitlist" email. Never throws; failures are logged. */
export async function sendWaitlistConfirmation(input: {
  locale: Locale;
  email: string;
  segment: Enums<"waitlist_segment">;
  newsletter: boolean;
}): Promise<void> {
  const { subject, html, text } = waitlistConfirmationEmail({ ...input, signedUpAt: new Date() });
  try {
    const response = await resendFetch("/emails", {
      method: "POST",
      body: {
        from: CONTACT.updatesFrom,
        to: [input.email],
        reply_to: CONTACT.replyTo,
        subject,
        html,
        text,
        tags: [{ name: "category", value: "waitlist_confirmation" }],
      },
    });
    if (response && !response.ok) console.error("waitlist confirmation failed", response.status);
  } catch (error) {
    console.error("waitlist confirmation failed", error instanceof Error ? error.message : "unknown error");
  }
}
