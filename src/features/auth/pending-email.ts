import "server-only";
import { cookies } from "next/headers";

/** Holds the address a confirmation email went to, so the "check your inbox" page can show it and resend. */
export const PENDING_EMAIL_COOKIE = "keyfly_pending_email";

export async function pendingEmail(): Promise<string | null> {
  return (await cookies()).get(PENDING_EMAIL_COOKIE)?.value ?? null;
}
