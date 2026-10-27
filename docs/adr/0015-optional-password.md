# 0015: Optional password alongside the emailed code

- **Status:** Accepted (DEC-16, 2026-10-27) · **Date:** 2026-10-27 · **Requirements:** S1, S4, F9 · **Built in:** FND-19 · **Amends:** [0014](0014-passwordless-sign-in.md)

## Context

ADR 0014 made the emailed code the only way to sign in. In use, every sign-in then costs an email, and email sending is rate-limited: a free Supabase project with the built-in sender allows about two auth emails an hour for the whole project, and even with our own sender (EML-04) a person who signs in often, or a tester, keeps waiting for the inbox. People who sign in often want to type a password, and password managers fill it for them.

## Decision

- **Both methods on the sign-in page.** "Send me a code" stays the main button; "Sign in with a password" is next to it. Both lead to the same landing routing (`homeFor`, ADR 0014).
- **A password is optional and set after a code sign-in.** New accounts always start with a code, which proves the address. A signed-in person sets or changes a password at `/account/password`, linked from the header and the change-email page (and from `/me` in PRF-02).
- **No reset link.** Someone who forgot their password signs in with a code and sets a new one. This keeps F9 closed: nothing depends on opening a link in the same browser.
- **Same answer for every failure (S4).** An unknown email, an account without a password and a wrong password all show "Wrong email or password."
- **Rules:** at least 10 characters, no composition rules (NIST SP 800-63B; `minimum_password_length`). A change needs a sign-in within the last 24 hours (`secure_password_change`). Password attempts are rate-limited per IP by Supabase (`sign_in_sign_ups`) and, later, by Turnstile and our own limiter (FND-10).
- **Staff keep TOTP.** A password, like a code, is one factor; school admins, reviewers and system admins still need `aal2` (FND-11).

## Consequences

- Returning people can sign in without an email, so email limits and delivery delays stop blocking them.
- Passwords are stored (bcrypt, by Supabase Auth). Leaked-password checks (HaveIBeenPwned) need Supabase Pro; turn them on for production (OPS-01).
- Hosted projects need `minimum_password_length = 10` and `secure_password_change = true`, pushed with `supabase config push` from only those declared properties (FND-16).
- End-to-end tests cover both methods: codes from Mailpit, passwords on the seed accounts and on a password set after a code sign-in.
