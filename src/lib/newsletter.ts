/**
 * The only messages a signup can show. Redirects carry a code, never text, so a
 * link like /newsletter?error=... cannot put arbitrary words on our page.
 */
export const SIGNUP_ERRORS = {
  invalid: "That doesn't look like an email address.",
  unavailable: "Signups aren't switched on yet. Please try again soon.",
  rate: "Too many attempts. Please wait a few minutes and try again.",
  failed: "Something went wrong on our side. Please try again.",
} as const;

export type SignupError = keyof typeof SIGNUP_ERRORS;

/** The message for a code from a URL, or null for anything we did not issue. */
export function signupErrorMessage(code: string | undefined | null): string | null {
  return code && Object.hasOwn(SIGNUP_ERRORS, code) ? SIGNUP_ERRORS[code as SignupError] : null;
}
