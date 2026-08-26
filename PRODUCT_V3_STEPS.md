# Herzliah Alumni Network — Product V3 rollout

## What changed
- Corrected Herzliah icon asset
- Top navigation simplified to Home + Directory
- Mentorship moved into Directory filters and profile opt-ins
- Context-aware account navigation:
  - signed out: Sign in / Claim profile
  - signed in + no profile: Complete profile
  - signed in + profile: My profile
  - admins: Admin link
- Real first-time claim/account flow
- First-login onboarding
- Secure authenticated-email profile claim RPC
- Manual verification request fallback
- Complete editable My Profile page
- Privacy, visibility and availability controls
- Forgot-password flow
- Admin dashboard shows verification requests

## Supabase migration required
Run `supabase/migrations/003_onboarding_claim_access.sql` in the Supabase SQL Editor.

## Important email configuration before real alumni use
In Supabase Authentication:
1. Set Site URL to the production Vercel URL.
2. Add the Vercel production URL and `/auth/callback` to Redirect URLs.
3. Customize the confirmation and password-reset email templates with Herzliah branding.
4. For a real launch, use a proper transactional SMTP provider / domain rather than the default development mail setup.

## Ideal real onboarding sequence
1. Herzliah imports alumnus as an invisible unclaimed record.
2. Herzliah sends invitation to the alumnus.
3. Invitation opens `/claim`.
4. Alumni email is matched without exposing record details.
5. Alumnus creates account and verifies email.
6. `/onboarding` securely attaches the authenticated user to the matching unclaimed record.
7. Profile starts hidden.
8. Alumnus reviews professional information, opt-ins and privacy settings.
9. Alumnus explicitly turns on directory visibility.
10. Profile appears to verified members only.

## Before real personal data
Still required: privacy counsel, data-processing agreement, production email provider, rate limiting/abuse review, backup/retention policy, admin approval actions for access requests, and QA.
