# Herzliah Alumni Network — Product Analysis & Build Plan

_Investigation: 2026-10-13 · branch `gab_test` @ `c3b0346` · live Supabase project `pjqbzycokfomwaxbjlai`_

Sources read: every file under `app/`, `components/`, `lib/`, `supabase/migrations/`, the four rollout notes
(`README.md`, `UPGRADE_STEPS.md`, `PRODUCT_V3_STEPS.md`, `V4_STEPS.md`), the approved design
(`DESIGN_REFERENCE_PREVIOUS_PREVIEW.html`), git history, plus read-only probes of the live Supabase REST API
using the publishable key.

---

## 1. What we are building

A **private, verified professional network for Herzliah High School (Montreal) graduates**. Alumni find each
other by career field, university, city, graduating class and what they are *open to* (mentoring, career advice,
hiring, internships, shadowing, speaking, introductions, helping students), then make contact.

The core idea, from the approved design, is **"Claim, don't fill out"**:

1. The Alumni Office imports graduates from school records as **invisible, unclaimed** records.
2. Each graduate is invited, verifies the email the school has on file, and **claims** the record.
3. They complete a short onboarding wizard and **choose** what the directory shows and whether they can be contacted.
4. Only verified members can see the directory.
5. A **twice-yearly nudge** ("one click confirms your details are still right") keeps the data fresh without staff chasing people.

**Strategic shape: a multi-school SaaS, with Herzliah as tenant #1.** The schema is already multi-tenant
(`institutions`, `institution_memberships`, `institution_id` on every tenant table), and the design's top nav has a
"For schools" entry. Today the tenant is hard-coded to `'herzliah'` inside the SQL functions.

| Layer | Technology |
|---|---|
| Web app | Next.js 15 (App Router), React 19, TypeScript, hand-written CSS (`app/globals.css`) |
| Backend | No custom API. The browser and server components talk to Supabase directly with the publishable key. Authorization is Postgres **RLS** plus `SECURITY DEFINER` RPCs. Next server actions are used only on `/admin`. |
| Auth | Supabase Auth: email + password, email confirmation, PKCE `code` exchange at `/auth/callback` |
| Hosting | Vercel, auto-deploying from GitHub `main` |
| i18n | EN/FR dictionary (`lib/i18n.ts`), stored in a cookie and localStorage |
| CSV import | `papaparse` in the browser |

**How it was delivered:** 33 commits, almost all "Add files via upload" through the GitHub web UI
(2026-08-26 → 2026-09-06). Versions V1→V4 are described in the four markdown files. DB changes were applied by
pasting SQL into the Supabase SQL editor, and some of that SQL was never committed (see F1).

---

## 2. Actors

### 2.1 Human actors

| # | Actor | Real person | How the system represents them | Can do today | Still needs |
|---|---|---|---|---|---|
| A1 | **Visitor** | Anyone on the internet | `anon` role | View landing; check whether an email is claimable; start a claim; submit a verification request | Nothing sensitive should be exposed (see F6) |
| A2 | **Unclaimed alumnus** | Graduate the school imported who has no account yet | `alumni_profiles` row, `user_id = null`, `claim_email` set, invisible | Nothing; they are a *data subject*, not a user | An invitation, plus legal basis to hold and contact them |
| A3 | **Claimant** | Graduate who just created an account | `auth.users` row; no membership yet | `/onboarding` → "Match my alumni record" | Cross-device email confirmation that works (F9) |
| A4 | **Unmatched applicant** | Graduate whose email is not on file (new address, maiden name, never imported) | `access_requests` row, `status = pending` | Submit `/request-access` | A defined approval outcome and notifications (F15, F16) |
| A5 | **Verified alumnus (member)** | Claimed, onboarded graduate | `institution_memberships.role = 'alumni'`, `status = 'active'`, profile claimed | Directory, profile pages, contact (reveal email), edit own profile, visibility and contact toggles | Reconfirmation, relay messaging, data export and deletion |
| A6 | **Institution admin** | Alumni Office staff (the design shows "Tova Havis") | `role = 'institution_admin'` | `/admin`: stats, roster search, CSV import (4 columns), approve/reject requests | Invitations, record actions, audit log, settings, MFA |
| A7 | **Super admin** | Platform operator (you and the dev team) | `role = 'super_admin'` membership row, inserted **by hand in SQL** | Everything, across tenants, via RLS; no UI of its own | Platform console; a proper `platform_admins` table |
| A8 | **Student** (planned) | Current Herzliah students | `member_role` enum has `'student'`; the `student_contact_allowed` flag and a "Helping current students" option exist | Nothing; no flow, no UI | Phase 3 |

### 2.2 System actors

| Actor | Role | State today |
|---|---|---|
| **Supabase Auth** | Accounts, confirmation and reset emails, sessions. Its JWT `email` claim is what the claim trusts. | Working, but on the default email sender |
| **Postgres (RLS + RPCs)** | The *only* authorization layer | Working, with leaks (F3–F5) and unversioned functions (F1) |
| **Email provider (SMTP/API)** | Confirmations, invitations, nudges, request decisions, relay messages | ❌ **Not configured.** Supabase's default sender only delivers to your own Supabase team addresses, so real alumni would never receive the confirmation email. |
| **Scheduler** (pg_cron or Vercel Cron) | Reconfirmation nudges, invitation expiry | ❌ Does not exist |
| **Vercel** | Hosting, env vars, preview deploys | Working; previews point at the production DB |

---

## 3. Current state

### 3.1 Route map (as built)

| Route | Who | Guard (exact behaviour in code) | What it does | Status |
|---|---|---|---|---|
| `/` | everyone | none | Landing page. Stats are hard-coded ("50 demo alumni") and the "Recently joined" people are fictional. | ✅ static, 🟡 F25 |
| `/login` | visitor | none | Email + password sign-in; "Forgot password" | ⚠ F7, F10 |
| `/claim` | visitor | signed-in users are redirected to `/onboarding` | `find_claimable_profile(email)` → `signUp` | ⚠ F6 |
| `/request-access` | visitor | none | `request_alumni_access` RPC | ⚠ F1, F16 |
| `/auth/callback` | — | — | `exchangeCodeForSession`, then redirect to `next` | ❌ F7, F9 |
| `/onboarding` | signed in | not signed in → `/login?next=/onboarding`; already onboarded → `/me` | 5-step wizard: Account (match), Herzliah, Education, Career, Network & privacy | ⚠ F1, F13, F14 |
| `/me` | signed in with profile | no profile or not onboarded → `/onboarding` | `ProfileEditor` | ⚠ F14, F22 |
| `/directory` | signed in | not signed in → `/login?next=/directory` (no membership check; RLS returns nothing to non-members) | Loads every visible profile and filters in the browser | ⚠ F12 |
| `/profile/[id]` | signed in | RLS; `notFound()` if hidden | Profile, work history, education, open-to, contact | ⚠ F3, F4, F22 |
| `/admin` | admins | membership role check; otherwise "No administrator access" | Stats, roster, CSV import, verification requests | ⚠ F18–F20 |

Nav states (`components/AuthActions.tsx`): signed out → *Sign in / Claim your profile*; signed in with no profile →
*Complete profile*; with profile → *My profile*; admin → plus *Admin*.

### 3.2 Database today (repo migrations plus live-only additions)

`institutions` · `institution_memberships` · `alumni_profiles` · `availability_flags` · `alumni_experience` ·
`alumni_education` · `invitations` (**unused**) · `access_requests` · `audit_log` (written only by the claim RPC).

RPCs:

- In the repo: `is_member_of`, `is_admin_of`, `is_super_admin`, `find_claimable_profile`, `claim_my_profile`.
- **Live only:** `request_alumni_access`, `approve_access_request`, `reveal_contact_email`.

---

## 4. Findings: bugs, risks, drift

🔴 = must fix before any real alumni data · 🟠 = functional gap · 🟡 = polish

### 🔴 Security and integrity

**F1. The repo no longer matches the live database.** Read-only probes of production show these exist live but in
**no migration**:

- columns `alumni_profiles.work_city`, `work_country`, `contact_topics`, `student_contact_allowed`, and `availability_flags.student_questions`
- RPCs `request_alumni_access`, `approve_access_request`, `reveal_contact_email`

A fresh environment built from the repo is broken: onboarding save, contact, request access and approval all fail.
Worse, the SQL of those three RPCs, including their permission checks, has never been reviewed.
→ `supabase db pull`, commit it as migration `005`, and make every future DB change a committed migration.

**F2. `approve_access_request` runs for anonymous callers.** A call with only the publishable key returned
*"Verification request not found."*, so it does its lookup **before** any auth check. If the admin check is missing
or comes later, anyone holding a request ID could approve it.
→ Read its source now, put the `is_admin_of()` check first, and `revoke execute … from anon, public` on every
function that doesn't need anon.

**F3. Members can read every column of every visible profile.** RLS works on rows, not columns.
`profiles_read_same_tenant` ([001:91](../supabase/migrations/001_initial_schema.sql)) lets any signed-in member call
the REST API with `select=claim_email,user_id,…` and collect every visible alumnus's email. That bypasses both
`contact_allowed` and the `reveal_contact_email` gate.
→ Move private fields into an `alumni_private` table that only the owner and admins can read (§6).

**F4. Child tables leak hidden and unclaimed profiles.** The SELECT policies on `alumni_experience`
([004:22](../supabase/migrations/004_full_profile_package.sql)), `alumni_education` (004:42) and `availability_flags`
(001:95) check only tenant membership. A member can read the work and education history of hidden profiles, and
of imported graduates who never consented.
→ The policy must check the parent profile with the same visibility predicate.

**F5. Owners can rewrite system columns.** `profiles_update_owner_admin` (001:93) lets an alumnus change their own
`institution_id`, `claim_email`, `claimed_at`, `privacy_preset` and `onboarding_completed_at`.
→ Add a `BEFORE UPDATE` trigger that rejects changes to protected columns from non-admins, or use column-level `GRANT UPDATE`.

**F6. Email enumeration on `/claim`.** `find_claimable_profile` (001:78) can be called anonymously with no rate
limit, and it answers "is this address a Herzliah graduate on file?".
→ Make the response uniform ("if we have a record, we've emailed you a link"), and add CAPTCHA and rate limiting.

**F7. Open redirect.** In `/auth/callback` ([route.ts:7,12](../app/auth/callback/route.ts)) the `next` parameter is
not validated, so `?next=https://evil.example` sends a freshly authenticated user off-site. Login has the same
pattern ([login/page.tsx:17,42](../app/login/page.tsx)).
→ Accept only paths that start with a single `/`.

**F8. The claim depends entirely on email confirmation.** `claim_my_profile` attaches whatever record matches the
JWT email. If "Confirm email" is ever switched off in Supabase, anyone can sign up with a graduate's address and take
over their record.
→ Lock that setting and document why, in the SQL and in the runbook.

**F9. Auth emails don't work for real alumni.** Two problems:

- Default SMTP only delivers to Supabase team members.
- PKCE `code` links only work in the *same browser* that started sign-up. A typical alumnus signs up on a laptop and opens the email on their phone; the exchange then fails and the callback swallows the error ([route.ts:10](../app/auth/callback/route.ts)).

→ Set up custom SMTP, and add an `/auth/confirm` route that uses `token_hash` + `verifyOtp`.

### 🟠 Functional gaps

- **F10. Password reset is a dead end.** `redirectTo` points to `/login` ([login/page.tsx:55](../app/login/page.tsx)), and no page ever calls `updateUser({ password })`.
- **F11. No `middleware.ts` session refresh.** `@supabase/ssr` requires it; without it sessions expire mid-use and refreshed cookies are lost ([server.ts](../lib/supabase/server.ts) swallows cookie writes).
- **F12. The University filter ignores real alumni.** The directory filters on `alumni_profiles.universities[]` ([DirectoryClient.tsx:162,212](../components/DirectoryClient.tsx)), but onboarding and `/me` write to `alumni_education`. Only the 50 demo seeds have `universities` filled in.
- **F13. Visibility defaults to on, against the spec.** `PRODUCT_V3_STEPS.md` says a profile starts hidden and the alumnus turns it on. The claim RPC does set it hidden, but the wizard checkbox defaults to `true` ([OnboardingClient.tsx:116](../components/OnboardingClient.tsx)), so it is a pre-ticked opt-in, which is weak consent under Quebec's Law 25. There are also two overlapping controls (`is_directory_visible` and `privacy_preset`), and `privacy_preset` has no UI.
- **F14. Profile saves are not atomic.** The wizard and `/me` each make about 6 separate client calls, and errors from 5 of them are ignored. Education and experience are delete-then-insert, so one failed insert silently wipes them ([OnboardingClient.tsx:334-416](../components/OnboardingClient.tsx), [ProfileEditor.tsx:23](../components/ProfileEditor.tsx)).
  → Use a single transactional `save_my_profile(jsonb)` RPC.
- **F15. Signed-in unmatched users hit a dead end.** `/claim` bounces them to `/onboarding`, whose "couldn't match" message has no link to `/request-access`.
- **F16. Access-request approval is undefined.** Nothing in the repo says what "Approve" creates or links, and neither decision sends an email.
  The admin page also queries requests with `institution_id IS NULL`, which suggests the live RPC stores no tenant. In that case the RLS (`institution_id is not null and is_admin_of(…)`) hides those requests from **institution admins**, and only super admins see them. This needs checking.
- **F17. Invitations don't exist yet.** The `invitations` table is unused: no token generation, sending, expiry, resend or tracking. The design's "Invites pending" stat can't be computed.
- **F18. CSV import is minimal.** It takes 4 columns, inserts from the client and does no validation (a bad `grad_year` becomes `NaN`). There is no preview, and one duplicate email fails the whole batch because of the unique index (001:45). There is no batch history ([AdminImport.tsx](../components/AdminImport.tsx)).
- **F19. Admins can't act on records.** There is no edit, suspend, archive or delete, mark deceased, merge duplicates, manage roles, view the audit log or export. The roster "View" link only shows for claimed records.
- **F20. The admin page assumes one admin membership.** `.maybeSingle()` ([admin/page.tsx:24](../app/admin/page.tsx)) errors if a user has more than one.
- **F21. The twice-yearly reconfirmation is not built.** `last_confirmed_at` only changes when the profile is saved.
- **F22. Onboarding and profile fields don't line up.**
  - Onboarding collects languages, website, work city and country, contact topics and the student-contact toggle, but `/me` can't edit them.
  - `/profile/[id]` doesn't show languages, LinkedIn, website or contact topics.
  - The "Helping current students" option has no label on the profile page or in the directory.
- **F23. The tenant is hard-coded.** `'herzliah'` is a literal in `find_claimable_profile` and `claim_my_profile`. `NEXT_PUBLIC_DEFAULT_INSTITUTION_SLUG` is documented but never read.

### 🟡 Polish

- **F24. Most pages are English-only.** Only `Nav` and `DirectoryClient` use translations; every other page is hard-coded English, `<html lang="en">` is fixed, and `lib/i18n-server.ts` is unused.
- **F25. The landing page shows fake data.** Hard-coded stats and fictional "Recently joined" people. Showing real people on a public page would need their consent.
- **F26. 50 fictional seed profiles are in production.** Purge them before launch (`id::text like '00000000-0000-4000-8000-%'`).
- **F27. Engineering hygiene.** No tests, lint, CI, generated DB types (`any` everywhere) or error/not-found pages, and no staging environment. Code ships by uploading through the GitHub web UI.

---

## 5. Build list: everything to configure and implement

### 5.1 Configuration (dashboards, no code)

**Supabase → Authentication**
- [ ] Keep **Confirm email = ON**. This is the security precondition of the claim (F8).
- [ ] Custom SMTP (Resend, Postmark or AWS SES) with a Herzliah sender such as `alumni@herzliah.ca` (F9).
- [ ] Site URL = production domain. Redirect allow-list: `https://<prod>/auth/**`, the Vercel preview wildcard, and `http://localhost:3000/**`.
- [ ] Branded EN/FR email templates for Confirm signup, Reset password, Change email and Invite. Links go to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=…`.
- [ ] CAPTCHA (Cloudflare Turnstile) on sign-up, sign-in and password reset.
- [ ] Review auth rate limits (emails per hour, sign-ups per IP).
- [ ] Password policy: at least 10 characters, plus leaked-password protection (Pro plan).
- [ ] MFA (TOTP) for every admin; enforce `aal2` in the app.

**Supabase → Project and database**
- [ ] Pro plan: daily backups, no auto-pause (PITR optional).
- [ ] Check the project region. If it is outside Quebec, a Law 25 privacy impact assessment is needed (see Legal below).
- [ ] A separate **staging** project for Vercel previews and demo seeds.
- [ ] Enable `pg_cron` (or use Vercel Cron) for nudges and invitation expiry.
- [ ] Run the **Security Advisor** and **Performance Advisor** and fix their findings.
- [ ] Revoke default `EXECUTE` on public functions from `anon` and `public`, then grant explicitly.
- [ ] Storage bucket `avatars` with RLS, if profile photos are wanted.

**Vercel**
- [ ] Env vars, scoped per environment:

  | Var | Notes |
  |---|---|
  | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | exist |
  | `NEXT_PUBLIC_SITE_URL` | absolute links in emails |
  | `NEXT_PUBLIC_DEFAULT_INSTITUTION_SLUG` | `herzliah`, once the code reads it |
  | `SUPABASE_SECRET_KEY` | **server-only, never `NEXT_PUBLIC_`**; used for invitations and admin operations |
  | `EMAIL_API_KEY`, `EMAIL_FROM` | invitations, nudges, relay messages |
  | `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | CAPTCHA |
  | `CRON_SECRET` | if using Vercel Cron |
- [ ] Custom domain (for example `alumni.herzliah.ca`).
- [ ] Point preview deployments at the staging Supabase project.

**DNS and email deliverability**
- [ ] SPF, DKIM and DMARC on the sending domain; bounce and complaint webhooks feeding back into `invitations.status`.

**GitHub**
- [ ] Stop uploading through the web UI: work in branches and PRs, and protect `main`.
- [ ] CI that runs `tsc --noEmit`, `next build` and lint; turn on Dependabot.

**Legal and governance** (Quebec Law 25 + PIPEDA; confirm with privacy counsel)
- [ ] Privacy policy and Terms (EN/FR), linked in the footer and accepted during onboarding. Store the version and timestamp.
- [ ] Herzliah names a person in charge of protecting personal information.
- [ ] A privacy impact assessment for processing outside Quebec (Supabase, Vercel, email provider).
- [ ] Data processing agreements with Supabase, Vercel and the email provider.
- [ ] A legal basis for importing graduates from school records and emailing them; a CASL review for invitation and nudge emails.
- [ ] A retention policy covering never-claimed records, deceased alumni and opt-outs; an incident register and breach procedure.
- [ ] A confidentiality and acceptable-use agreement for Alumni Office admins.

### 5.2 Implementation backlog

**Phase 0: stabilize the foundation.** Do this first. Users see almost none of it.

| # | Item | Fixes | Where |
|---|---|---|---|
| 0.1 | Supabase CLI: `link`, then `db pull` → commit `005_capture_live_schema.sql`; review the 3 untracked RPCs | F1, F2 | `supabase/` |
| 0.2 | `supabase gen types typescript` → `lib/database.types.ts`; type both clients and remove the `any`s | F27 | `lib/supabase/*` |
| 0.3 | `middleware.ts` that refreshes the session on every request | F11 | root |
| 0.4 | `safeNext()` helper used by the callback and login | F7 | `app/auth/callback`, `app/login` |
| 0.5 | `/auth/confirm` (`verifyOtp` with `token_hash`) and an `/auth/error` page; keep `/auth/callback` for OAuth only | F9 | `app/auth/*` |
| 0.6 | Security migration: revoke anon `EXECUTE`; parent-aware child-table policies; protected-column trigger; `alumni_private` split plus a directory-safe view | F2–F5 | migration `006` |
| 0.7 | Staging project, with demo seeds only there; CI pipeline | F26, F27 | |

**Phase 1: launch-critical.** After this, real alumni can join safely.

| # | Item | Fixes |
|---|---|---|
| 1.1 | **Invitation system**: `create_invitations(profile_ids)` stores token hashes; a server action with the secret key sends branded emails; `/claim?token=` landing page; expiry, resend and revoke; invite status in the roster | F17 |
| 1.2 | **Non-enumerating claim**: `/claim` → `request_claim_link(email)` always shows the same message, emails a link if there is a match, and otherwise offers verification; Turnstile and rate limiting | F6 |
| 1.3 | `claim_with_invitation(token)`: the tenant comes from the token. Keep tenant-aware email-match as a fallback. | F23 |
| 1.4 | **Access-request lifecycle**: on approve, the admin links an existing record or creates one, and an invitation goes out automatically. On reject, an email with the reason. An "ask for more info" state. Store `institution_id`. A CTA from the onboarding no-match screen. | F15, F16 |
| 1.5 | `save_my_profile(payload jsonb)`, one transaction, used by both onboarding and `/me` | F14 |
| 1.6 | **Visibility model**: one `visibility` enum (`hidden` / `members` / `admins_only`), default `hidden`, an explicit opt-in step, consent recorded | F13 |
| 1.7 | `/auth/reset-password` page (`updateUser`) and the recovery redirect | F10 |
| 1.8 | `alumni_education` becomes the single source for schools; the directory filters on it; drop `universities[]` and `degrees[]` | F12 |
| 1.9 | `/me` matches onboarding field for field; the profile page shows languages, LinkedIn, website, contact topics and the student option | F22 |
| 1.10 | Contact v1 hardened: `reveal_contact_email` checks `contact_allowed` and membership, logs to `contact_events`, and enforces a daily limit | F3 |
| 1.11 | **Admin import v2**: server-side; more columns (maiden name, phone, school student ID); validation and preview; upsert and dedupe; per-row errors; `import_batches` | F18 |
| 1.12 | **Admin roster actions**: view and edit any record, suspend or reactivate, archive or delete, mark deceased, resend invite; fix the multi-membership query | F19, F20 |
| 1.13 | Legal pages and consent capture; self-service account deletion and data export (Law 25 portability) | Legal |
| 1.14 | Full EN/FR coverage: every page, the emails and the career-field labels; `<html lang>` from the cookie | F24 |
| 1.15 | Landing stats from an anon-safe `public_stats()` RPC, or remove them; purge demo seeds from production | F25, F26 |
| 1.16 | Super-admin bootstrap script instead of hand-run SQL; MFA enforced for admins | |

**Phase 2: engagement and operations**

| # | Item |
|---|---|
| 2.1 | **Reconfirmation nudges**: a daily job finds profiles past `next_reconfirm_due_at` and emails a signed one-click "Still accurate" link plus an "Update" link. Reminders follow, and after N of them the profile is flagged stale or auto-hidden (configurable per school). (F21) |
| 2.2 | **"Message via the Network" relay** (in the design): a form on the profile; the platform sends the email with `Reply-To` set to the sender, so the recipient's address is never exposed. Rate limits, report and block. |
| 2.3 | Audit-log writes for every admin and security action, plus an admin viewer |
| 2.4 | Dashboard metrics: % claimed, invites pending or expired, stale profiles, recent activity (in the design) |
| 2.5 | Expertise tags (in the design); languages and graduating-decade filters |
| 2.6 | Profile photos (Storage + RLS) |
| 2.7 | Notification preferences and one-click unsubscribe (CASL) |
| 2.8 | Report a profile or message; admin moderation queue |

**Phase 3: scale and SaaS**

| # | Item |
|---|---|
| 3.1 | Tenant resolution by subdomain or custom domain; remove every `'herzliah'` literal; per-tenant branding from `institutions` |
| 3.2 | Platform-admin console: create an institution, invite its admins, usage |
| 3.3 | Student role: the school verifies students, who see only alumni with `student_contact_allowed` |
| 3.4 | Server-side search and pagination (Postgres FTS or `pg_trgm`) beyond about 5k profiles |
| 3.5 | Per-tenant career fields and "open to" options with EN/FR labels (lookup tables, §6) |
| 3.6 | Mentorship programs, events and job board (the design's "Mentorship" nav) |

---

## 6. Target data model

### 6.1 Design principles
1. **Split public and private data.** Directory-safe fields stay in `alumni_profiles`; contact and matching data move to `alumni_private`, readable only by the owner and admins (fixes F3).
2. **Explicit lifecycle and visibility enums.** No more inferring state from `claimed_at` or `user_id` nulls, or from two overlapping visibility flags.
3. **Bilingual, per-tenant option lists.** Career fields and "open to" options become lookup tables with `label_en` and `label_fr`, instead of TS constants and boolean columns.
4. **Multi-table writes go through RPCs** in one transaction, never as N client calls.
5. **Every outbound email has a row** (invitation, reconfirmation, message) for tracking, rate limits and audit.
6. **Platform admins are not tenant members.** Use a separate `platform_admins` table.

### 6.2 Enums

| Enum | Values |
|---|---|
| `member_role` | `institution_admin`, `alumni`, `student` (`super_admin` moves to `platform_admins`) |
| `member_status` | `active`, `suspended`, `revoked` |
| `profile_status` | `imported`, `invited`, `claimed`, `suspended`, `archived`, `deceased` |
| `profile_visibility` | `hidden`, `members`, `admins_only` |
| `invitation_status` | `pending`, `sent`, `bounced`, `claimed`, `expired`, `revoked` |
| `request_status` | `pending`, `needs_info`, `approved`, `rejected` |
| `contact_channel` | `email_reveal`, `relay_message` |

### 6.3 Tables

**Tenancy and identity**

| Table | Columns | Notes |
|---|---|---|
| `institutions` *(existing +)* | `id` PK, `name`, `slug` UQ, `logo_url`, `primary_color`, `accent_color`, `created_at`, **+** `custom_domain` UQ null, `default_locale` (`en`/`fr`), `reconfirm_interval_months` int default 6, `is_active` bool, `settings` jsonb | |
| `platform_admins` *(new)* | `user_id` PK → `auth.users`, `created_at`, `created_by` | Replaces the `super_admin` membership |
| `institution_memberships` *(existing +)* | `id` PK, `institution_id` FK, `user_id` FK → `auth.users`, `role`, `status`, `created_at`, **+** `suspended_at`, `suspended_by`, `suspension_reason`, `last_seen_at`; UQ(`institution_id`, `user_id`) | |
| `consents` *(new)* | `id` PK, `user_id` FK, `institution_id` FK, `document` (`privacy_policy`/`terms`/`directory_visibility`), `version`, `accepted_at`, `ip_hash`, `user_agent` | Law 25 evidence |

**Alumni profile core**

| Table | Columns | Notes |
|---|---|---|
| `alumni_profiles` *(restructured)* | `id` PK, `institution_id` FK, `user_id` FK null (UQ per institution), `status` profile_status, `first_name`, `last_name`, `preferred_name`, `grad_year`, `bio`, `current_city`, `current_country`, `work_city`, `work_country`, `career_field_id` FK, `career_field_other`, `job_title`, `current_employer`, `languages` text[], `linkedin_url`, `website_url`, `avatar_path`, `contact_topics`, `visibility` default `hidden`, `contact_allowed` default false, `student_contact_allowed` default false, `claimed_at`, `onboarding_completed_at`, `last_confirmed_at`, `next_reconfirm_due_at`, `import_batch_id` FK null, `created_at`, `updated_at`, `deleted_at` | **Removed:** `claim_email` (→ private), `universities[]` and `degrees[]` (→ education), `industry` (dropped in V4), `profession` (→ `career_field_id`), `privacy_preset` and `is_directory_visible` (→ `visibility`) |
| `alumni_private` *(new, 1:1)* | `profile_id` PK/FK, `institution_id` FK, `claim_email` (UQ lower per institution while unclaimed), `contact_email`, `phone`, `maiden_name`, `school_student_id`, `admin_notes`, `created_at`, `updated_at` | Owner and admin RLS only |
| `alumni_education` *(existing)* | `id`, `profile_id` FK, `institution_id` FK, `school`, `degree`, `field_of_study`, `graduation_year`, `sort_order`, `created_at` | Parent-aware RLS |
| `alumni_experience` *(existing ±)* | `id`, `profile_id` FK, `institution_id` FK, `job_title`, `employer`, `career_field_id` FK, `location`, `start_year`, `end_year`, `is_current`, `sort_order`, `created_at`; CHECK `end_year >= start_year` | Parent-aware RLS |
| `career_fields` *(new lookup)* | `id`, `institution_id` null (null = global default), `key`, `label_en`, `label_fr`, `sort_order`, `is_active` | Seeded from `lib/profile-options.ts` |
| `offer_types` *(new lookup)* | `id`, `institution_id` null, `key` (`mentoring`, `career_advice`, `job_opportunities`, `offering_jobs`, `offering_internships`, `shadowing`, `speaking`, `networking`, `entrepreneurship`, `student_questions`), `label_en`, `label_fr`, `audience` (`alumni`/`students`/`both`), `sort_order`, `is_active` | Replaces the boolean columns |
| `profile_offers` *(new join)* | `profile_id` FK, `offer_type_id` FK, `institution_id` FK; PK(`profile_id`, `offer_type_id`) | Replaces `availability_flags` |
| `profile_tags` *(new)* | `profile_id` FK, `institution_id` FK, `tag`; PK(`profile_id`, lower(`tag`)) | The design's "Expertise" |

**Onboarding and verification**

| Table | Columns |
|---|---|
| `invitations` *(existing +)* | `id`, `institution_id` FK, `alumni_profile_id` FK, `token_hash` UQ, `expires_at`, `sent_at`, `claimed_at`, `created_at`, **+** `email` (snapshot), `status`, `created_by` FK, `send_count`, `last_sent_at`, `revoked_at`, `last_error`, `provider_message_id` |
| `access_requests` *(existing +)* | `id`, `institution_id` FK **not null**, `user_id` FK **null** (anonymous requests allowed), `email`, `first_name`, `last_name`, `maiden_name`, `grad_year`, `note`, `status`, **+** `matched_profile_id` FK null, `review_note`, `reviewed_by`, `reviewed_at`, `decision_email_sent_at`, `created_at` |
| `import_batches` *(new)* | `id`, `institution_id` FK, `uploaded_by` FK, `filename`, `row_count`, `inserted_count`, `updated_count`, `skipped_count`, `errors` jsonb, `created_at` |

**Engagement and safety**

| Table | Columns |
|---|---|
| `contact_events` *(new)* | `id`, `institution_id`, `sender_user_id`, `sender_profile_id`, `recipient_profile_id`, `channel`, `created_at` |
| `messages` *(phase 2)* | `id`, `institution_id`, `sender_profile_id`, `recipient_profile_id`, `subject`, `body`, `sent_at`, `delivery_status`, `provider_message_id`, `reported_at` |
| `reconfirmation_requests` *(new)* | `id`, `institution_id`, `profile_id`, `token_hash` UQ, `reminder_number`, `sent_at`, `expires_at`, `confirmed_at`, `provider_message_id` |
| `reports` *(phase 2)* | `id`, `institution_id`, `reporter_user_id`, `target_profile_id`, `message_id` null, `reason`, `status`, `reviewed_by`, `reviewed_at`, `created_at` |
| `audit_log` *(existing)* | `id` bigint identity, `institution_id`, `actor_user_id`, `action`, `target_type`, `target_id`, `metadata` jsonb, `created_at` |
| `student_profiles` *(phase 3)* | `id`, `institution_id`, `user_id`, `first_name`, `last_name`, `expected_grad_year`, `verified_by`, `verified_at`, `status` |

### 6.4 Target access matrix (RLS)

| Table | Visitor | Member | Owner | Institution admin | Platform admin |
|---|---|---|---|---|---|
| `alumni_profiles` | — | SELECT where `visibility='members'` and `status='claimed'` | SELECT; UPDATE non-system columns | ALL in tenant | ALL |
| `alumni_private` | — | — | SELECT; UPDATE `contact_email` | ALL in tenant | ALL |
| education / experience / offers / tags | — | SELECT if parent visible | ALL | ALL in tenant | ALL |
| `invitations` | `peek_invitation` RPC only | — | — | ALL in tenant | ALL |
| `access_requests` | INSERT via RPC (CAPTCHA) | — | SELECT own | SELECT, UPDATE in tenant | ALL |
| `contact_events` / `messages` | — | INSERT via RPC; SELECT own | — | SELECT in tenant | ALL |
| `consents` | — | INSERT and SELECT own | — | SELECT in tenant | ALL |
| `audit_log` | — | — | — | SELECT in tenant | ALL |

### 6.5 Target RPC catalog

| RPC | Caller | Purpose |
|---|---|---|
| `request_claim_link(email, captcha)` | anon | Always returns OK; if there is a match, issues and sends an invitation |
| `peek_invitation(token)` | anon | Returns `{first_name, institution_name, expired}` for the claim page |
| `claim_with_invitation(token)` | authenticated | The JWT email must equal the invitation email; links the profile and creates the membership |
| `claim_my_profile()` | authenticated | Email-match fallback, tenant-aware |
| `request_alumni_access(…)` | anon / authenticated | Creates an access request (CAPTCHA-checked) |
| `approve_access_request(id, link_profile_id?)` | admin | Links or creates the record, then issues an invitation |
| `reject_access_request(id, reason)` | admin | Rejects and queues the decision email |
| `save_my_profile(payload jsonb)` | owner | One transaction for the profile, private fields, education, experience, offers and tags |
| `confirm_profile(token)` | token holder | One-click reconfirmation |
| `reveal_contact_email(profile_id)` / `send_relay_message(…)` | member | Rate-limited and logged |
| `create_invitations(profile_ids[])` | admin | Creates token rows; the server sends the emails using the secret key |
| `import_alumni(rows jsonb)` | admin | Validated upsert plus an `import_batches` row |
| `set_membership_status(user_id, status, reason)` | admin | Suspend or reactivate, audited |
| `public_stats(slug)` | anon | Aggregate counts only |
| `delete_my_account()`, `export_my_data()` | owner | Law 25 rights |

### 6.6 Current → target column map

| Current | Target |
|---|---|
| `alumni_profiles.claim_email` | `alumni_private.claim_email` |
| `is_directory_visible` + `privacy_preset` | `visibility` |
| `claimed_at` / `user_id` null checks | `status` |
| `profession` (free text) | `career_field_id` (+ `career_field_other`) |
| `industry` | dropped |
| `universities[]`, `degrees[]` | `alumni_education` rows |
| `availability_flags.*` booleans | `profile_offers` rows → `offer_types` |
| `alumni_experience.career_field` text | `career_field_id` |
| `institution_memberships.role='super_admin'` | `platform_admins` |
| `access_requests.user_id` NOT NULL | nullable; `institution_id` NOT NULL |
