// Sign-in and signup settings. The first two mirror supabase/config.toml, which Supabase Auth enforces; tests/unit/config/auth.test.ts
// fails if they drift apart.

/** Mirrors [auth] minimum_password_length. */
export const MIN_PASSWORD_LENGTH = 10;
/** Mirrors [auth.email] otp_length: the digits in an emailed code. */
export const CODE_LENGTH = 6;

/** Cookies that carry a new account from the signup form to /join/verify until its email is confirmed. */
export const SIGNUP_CONFIRMATION = {
  cookies: {
    email: "alumni-confirmation-email",
    sent: "alumni-confirmation-sent",
    next: "alumni-confirmation-next",
  },
  path: "/join",
  maxAgeSeconds: 30 * 60,
  /** Wait before the confirmation email can be sent again. */
  resendCooldownMs: 60_000,
} as const;
