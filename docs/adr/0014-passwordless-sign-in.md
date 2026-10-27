# 0014: Passwordless sign-in with an emailed one-time code, and landing routing

- **Status:** Accepted (DEC-15, 2026-10-27); amended by [0015](0015-optional-password.md), which adds an optional password · **Date:** 2026-10-27 · **Requirements:** S1, S4, F9 · **Built in:** FND-09

## Context

Alumni sign in a few times a year. With passwords, most of them would forget theirs between visits, so the password mostly creates reset emails and support requests. The MVP's emailed links also broke when opened on another device (F9). Every sign-in already depends on the person's inbox (sign-up confirmation, resets), so the password adds little protection.

## Decision

- **Sign-in is an emailed code.** The person enters their email and receives a 6-digit code (Supabase `signInWithOtp`), then types it in (`verifyOtp`). There is no password field, reset flow or password policy in the app.
- **One form for new and returning people.** An unknown email gets a code too, and its login is created when the code is verified. The answer on screen is the same either way (S4). A new login has no membership, so it lands on the sign-up page.
- **Codes:** 6 digits, valid 10 minutes, single use, re-sendable after 60 seconds. Sending and checking codes are rate-limited (Supabase limits plus FND-10). The code email goes through the auth email hook, branded per school and in the person's language (EML-04).
- **Changing email** sends a code to the new address.
- **Staff keep a second factor.** An emailed code proves only access to the inbox, so school admins, reviewers and system admins still enroll TOTP and need `aal2` (FND-11).
- **Landing routing.** After sign-in, one server function, `homeFor(user, school)`, sends each person to the home page for their role and state at the school of the current address:

| At this school, the person is… | Lands on |
|---|---|
| school admin or reviewer | `/admin` |
| approved alumnus, onboarding not finished | `/onboarding` |
| approved alumnus | `/directory` |
| sign-up pending, needs info, or rejected | the matching account page (ONB-06) |
| suspended | `/account/suspended` |
| not known, or sign-up withdrawn | `/join` |
| system admin, on `alumninetwork.ca` | the console (SA-01) |

  The same function backs the route guards and the `/` redirect for signed-in visitors. A `?next=` path wins only when it is relative (F7) and the person may open that page.

## Consequences

- No password storage, reset flow or leaked-password risk; F9 disappears because a code works on any device.
- Signing in depends on email delivery. Delivery failures and bounces must alert (EML-05, OPS-03).
- Sessions stay signed in on a device (refresh token), so a code is needed mainly on a new device or after signing out.
- End-to-end tests read codes from Mailpit. The seed keeps a local-only password on test accounts for scripts such as `npm run bench:directory`; the app never shows a password field.
