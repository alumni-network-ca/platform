# 0016: Separate account creation from school admission; password sign-in

- **Status:** Accepted by product review, 2026-11-01 · **Amends:** [0014](0014-passwordless-sign-in.md), [0015](0015-optional-password.md)
- **Design:** [Alumni Full Flow](../design/alumni-full-flow/README.md), Alumni canvas.

## Decision

The school shares its ordinary public `/join` link in its alumni email. The same link appears as **Join now** at the top right of the signed-out school navigation. Invitations do not contain individual admission tokens and do not grant membership.

A new applicant chooses an email and password at `/join`. Supabase sends an email confirmation link. Confirmation establishes a session, including when opened on a different device, and returns the applicant to the same Join page to supply their school details. Submitting creates the existing pending access request. Only a school reviewer or admin may admit them through the existing approval RPC; its permission checks, audit events, private profile defaults and notification outbox remain authoritative.

Existing accounts sign in with email and password at `/login`. Code sign-in is hidden for now. Existing passwordless accounts can set a password through the email recovery flow; email-change confirmation still uses both-address codes. Passwords keep the existing minimum of 10 characters and Supabase's recent-sign-in requirement for changes.

Confirmation and recovery links use the current school's origin, with the tenant selector preserved on shared preview hosts. The `/auth/confirm` handler verifies only signup/recovery token hashes, or a PKCE authorization code for provider-compatible links, writes host-only session cookies, and redirects to a fixed local destination. Verification links do not accept arbitrary redirect destinations. Failure responses do not disclose account existence.

An applicant can edit an open request, reply to a reviewer's question and check its status. Rejected and suspended accounts retain their state pages. Approval resumes the existing onboarding wizard with an explicit school-approval badge. The directory stays guarded until approval and profile setup.

## Hosting and validation

Apply the confirmation and recovery templates in `supabase/templates/` to each hosted Supabase project, with the matching redirect allowlist. This is Auth configuration, not a SQL migration. Link-based templates require the app's `/auth/confirm?flow=signup` or `?flow=recovery` redirect target; never replace the tenant-specific target with the root domain. Keep email confirmations enabled and configure SMTP in hosted environments. The existing school-decision outbox worker remains separate (EML-01); this change does not implement email delivery for review decisions.

Tests cover the real local signup and recovery emails, confirmation on another device, password-only sign-in, reviewer decisions, directory guards, navigation and the existing email-change flow. Worktree tests can select an isolated local Supabase project with `SUPABASE_WORKDIR`.
