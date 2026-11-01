/**
 * "Keep me signed in": without it the auth cookies are session cookies and end when the browser closes.
 * The choice itself is remembered in REMEMBER_COOKIE so token refreshes keep the same lifetime.
 */
export const REMEMBER_COOKIE = "keyfly_remember";

type CookieOptions = { maxAge?: number; expires?: Date };

export function authCookieOptions<T extends CookieOptions>(value: string, options: T, remember: boolean): T {
  // Deletions (sign-out) keep their expiry so the cookie is actually removed.
  if (remember || value === "" || options.maxAge === 0) return options;
  const rest = { ...options };
  delete rest.maxAge;
  delete rest.expires;
  return rest;
}

export function wantsRemember(cookieValue: string | undefined): boolean {
  return cookieValue !== "0";
}
