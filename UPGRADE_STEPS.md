# Upgrade this live Herzliah site

This version fixes the login flow, adds a Home navigation link, adds real directory filters, upgrades the directory/profile design, adds sign-out handling, and includes 50 fictional alumni records for testing.

## 1. Update GitHub
Upload the contents of this project into the existing `herzliah-alumni-network` repository, replacing files with the same paths. Do NOT upload `.env.local`.

Vercel is already linked to GitHub, so a new deployment should begin automatically after the commit.

## 2. Add the 50 fictional alumni to Supabase
In Supabase → SQL Editor → New query, paste the full contents of:

`supabase/migrations/002_seed_50_demo_alumni.sql`

Run it once. The final result should say `demo_profiles_ready = 50`.

These are fictional demo profiles only and can later be deleted/replaced with the real Herzliah import.

## 3. Login
The login page now uses email + password, which matches a user manually created under Supabase Authentication → Users.

Use the email/password you created for your Super Admin account. Do not share your password.

## Important production note
This is a polished pilot/test build, not a legal/security sign-off. Before real alumni data is imported, finish the invitation/claim verification workflow, transactional email, privacy/legal review, and production QA.
