/**
 * Sign-in methods offered in the customer app (canvas v2.4): password and Google. The one-time sign-in link by email
 * was removed (2026-11-02); password reset by email stays. Staff (admin.) sign in with a password only.
 */
export const AUTH_METHODS = {
  password: true,
  google: true,
} as const;

/**
 * Self-service sign-up. Closed in production until the general terms (ÁSZF) and the app privacy notice are
 * published (see src/config/consent.ts); signing in and password reset keep working for existing accounts.
 */
export const SIGN_UP_OPEN = process.env.NEXT_PUBLIC_APP_ENV !== "production";

/** Password rules – keep in sync with Supabase Auth → Password requirements. */
export const PASSWORD_MIN_LENGTH = 8;

/** Sign-up confirmation, password-reset and email-change links (Supabase → Auth → Email OTP expiration: 3600 s). */
export const EMAIL_LINK_VALID_HOURS = 1;
