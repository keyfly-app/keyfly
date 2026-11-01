import { PASSWORD_MIN_LENGTH } from "@/config/auth";

export type PasswordRule = "length" | "cases" | "digit";
export const PASSWORD_RULES: readonly PasswordRule[] = ["length", "cases", "digit"];

/** Which password rules are met. Used live in the form and again on the server. */
export function checkPassword(password: string): Record<PasswordRule, boolean> {
  return {
    length: password.length >= PASSWORD_MIN_LENGTH,
    cases: /\p{Ll}/u.test(password) && /\p{Lu}/u.test(password),
    digit: /\d/.test(password),
  };
}

export function isValidPassword(password: string): boolean {
  return password.length <= 72 && Object.values(checkPassword(password)).every(Boolean);
}
