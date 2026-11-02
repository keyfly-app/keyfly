import "server-only";
import { cookies } from "next/headers";

/**
 * Proof that this browser opened a valid password-reset link a moment ago. Set by the email-link handler after
 * Supabase verified the link; without it /reset-password does not let anyone set a password without the current one
 * (a signed-in session alone is not enough). Cleared once the new password is saved.
 */
export const RESET_COOKIE = "keyfly_reset";
export const RESET_VALID_SECONDS = 30 * 60;

export async function hasResetPass(): Promise<boolean> {
  return (await cookies()).get(RESET_COOKIE)?.value === "1";
}

export async function clearResetPass() {
  (await cookies()).delete(RESET_COOKIE);
}
