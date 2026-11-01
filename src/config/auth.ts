/**
 * Sign-in methods offered in the customer app. Google needs an OAuth client in Supabase first
 * (see the launch checklist); flip the flag once it is configured for the environment.
 */
export const AUTH_METHODS = {
  password: true,
  emailLink: true,
  google: false,
} as const;

/**
 * Self-service sign-up. Closed in production until the general terms (ÁSZF) and the app privacy notice are
 * published (see src/config/consent.ts); signing in and password reset keep working for existing accounts.
 */
export const SIGN_UP_OPEN = process.env.NEXT_PUBLIC_APP_ENV !== "production";

/** Password rules – keep in sync with Supabase Auth → Password requirements. */
export const PASSWORD_MIN_LENGTH = 8;

/** Sign-up confirmation, email sign-in and password-reset links (Supabase → Auth → Email OTP expiration). */
export const EMAIL_LINK_VALID_HOURS = 24;
