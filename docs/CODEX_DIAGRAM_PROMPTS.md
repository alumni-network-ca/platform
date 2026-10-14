# Codex prompts: user flows and DB schema diagrams

**How to use:** open Codex at the repo root.

1. Paste **Prompt 0 (shared context)**, then any single prompt (P1–P12, D1–D4).
2. To do everything in one run, paste Prompt 0 followed by **"Run everything"**.

Every prompt reads [`docs/PRODUCT_ANALYSIS.md`](PRODUCT_ANALYSIS.md). That file is the source of truth for actors
(§2), current state (§3), findings F1–F27 (§4), backlog IDs 0.x–3.x (§5) and the target data model (§6).

---

## Prompt 0: shared context and conventions (always paste first)

```text
You are producing documentation diagrams for the Herzliah Alumni Network repo (Next.js 15 App Router +
Supabase Postgres/RLS/Auth, deployed on Vercel). DO NOT modify application code or SQL migrations.
Only create files under docs/diagrams/.

Read first, fully:
- docs/PRODUCT_ANALYSIS.md: source of truth. Actors A1–A8, findings F1–F27, backlog ids (0.1, 1.2, …),
  target data model in section 6.
- app/**, components/**, lib/**, supabase/migrations/*.sql, to verify every "as-built" step you draw.
- Known drift (F1): the LIVE database also has columns alumni_profiles.work_city, work_country,
  contact_topics, student_contact_allowed, availability_flags.student_questions and RPCs
  request_alumni_access, approve_access_request, reveal_contact_email that are NOT in migrations.
  Treat them as existing but mark them "live-only".

Output rules:
1. Mermaid only. One diagram per file: docs/diagrams/<NN>-<kebab-name>.md containing an H1 title,
   a 2-4 sentence description, the ```mermaid block, then a "Notes" bullet list that expands every
   finding/backlog id referenced in the diagram (one line each).
2. Status styling: use these exact classDefs in EVERY flowchart and apply one class to every node:
     classDef built   fill:#E8F5E9,stroke:#2E7D32,color:#1B5E20
     classDef partial fill:#FFF8E1,stroke:#F9A825,color:#5D4037
     classDef broken  fill:#FFEBEE,stroke:#C62828,color:#B71C1C
     classDef todo    fill:#FAFAFA,stroke:#9E9E9E,stroke-dasharray:5 5,color:#616161
     classDef actor   fill:#0B2159,stroke:#0B2159,color:#FFFFFF
     classDef system  fill:#EDE7F6,stroke:#5E35B1,color:#311B92
   built = exists and works today · partial = exists but has a finding (append "⚠ F#" to the label)
   broken = security/blocking defect (append "⛔ F#") · todo = planned (append "▢ <backlog id>").
   Herzliah brand colours: navy #0B2159, burgundy #7B1E3D. Use them for actors only.
3. Swimlanes: one `subgraph` per actor or system, titled with the actor id and name (e.g. "A5 · Member").
4. Labels ≤ 7 words. Put RPC/table names in the label only where they matter, e.g. "claim_my_profile()".
   Quote any label that contains (), /, ?, :, # or emoji: A["label (x)"].
5. Decision nodes use {} with a question. Every branch edge has a label (|yes| / |no| / |match| …).
6. Mermaid hygiene: never use `end` as a node id, avoid reserved words as ids, keep ids short (n1, n2…),
   no HTML except <br/>. Use `flowchart TD` unless the prompt says otherwise.
7. Validate every file. If available run:
     npx -y @mermaid-js/mermaid-cli@11.4.2 -i docs/diagrams/<file>.md -o /tmp/check.svg
   and fix all errors. If the CLI can't run, parse-check with the mermaid npm package.
8. After all diagrams exist, build docs/diagrams/index.html: a single page that renders every diagram
   with mermaid@11.4.1 from https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js, with a left
   nav (grouped "User flows" / "Data model"), a legend for the 6 status classes, light/dark toggle,
   and a "copy mermaid source" button per diagram. Also docs/diagrams/README.md listing every file.
```

---

## Run everything

```text
Execute prompts P1 through P12, then D1 through D4, from docs/CODEX_DIAGRAM_PROMPTS.md in order,
following Prompt 0's conventions. Then build index.html and README.md. Finish with a short report:
files created, any step where the code disagreed with PRODUCT_ANALYSIS.md, and anything you could
not verify.
```

---

## User-flow prompts

### P1: System context and actor map

```text
Create docs/diagrams/01-system-context.md as `flowchart LR`.
Left: human actors A1 Visitor, A2 Unclaimed alumnus (data subject, dashed border, no arrows OUT),
A3 Claimant, A4 Unmatched applicant, A5 Member, A6 Institution admin, A7 Super admin,
A8 Student (todo ▢ 3.3).
Middle: trust boundaries as subgraphs:
  "Browser (publishable key)": Next.js client pages
  "Vercel / Next.js server": RSC pages, /auth/callback route, admin server actions
  "Supabase": Auth, PostgREST+RLS, SECURITY DEFINER RPCs, Postgres tables
  "Third parties": Email provider (todo ▢ config, today = Supabase default SMTP ⛔ F9),
                   Scheduler pg_cron / Vercel Cron (todo ▢ 2.1), Cloudflare Turnstile (todo ▢ 1.2)
Right: GitHub → Vercel deploy pipeline (partial ⚠ F27: web-upload commits, no CI, no staging).
Edges: each actor → the routes/systems they use (label with the main route, e.g. "/directory").
Show that the browser talks DIRECTLY to Supabase with the publishable key (that is why F3/F4 matter).
Mark the RLS node partial ⚠ F3 F4 F5 and the RPC node broken ⛔ F1 F2.
```

### P2: Sitemap, route guards and nav states

```text
Create docs/diagrams/02-sitemap-and-guards.md (`flowchart TD`).
Verify every redirect against the code in app/**/page.tsx and components/AuthActions.tsx.
Built routes and their guards:
  / (public) · /login (public; next param ⛔ F7) · /claim (signed-in → redirect /onboarding)
  /request-access (public) · /auth/callback (code exchange; ⛔ F7 F9)
  /onboarding (no user → /login?next=/onboarding; onboarding_completed_at set → /me)
  /me (no user → /login?next=/me; no profile or not onboarded → /onboarding)
  /directory (no user → /login?next=/directory) · /profile/[id] (no user → /login; hidden → 404)
  /admin (no user → /login?next=/admin; not admin → "No administrator access" page)
Add a second subgraph "Nav states (AuthActions)": signed out → [Sign in, Claim your profile];
signed in + no profile → [Complete profile]; + profile → [My profile]; + admin role → [Admin].
Planned routes as todo: /auth/confirm ▢0.5, /auth/error ▢0.5, /auth/reset-password ▢1.7,
/claim?token= ▢1.1, /confirm?token= (reconfirm) ▢2.1, /legal/privacy & /legal/terms ▢1.13,
/me/privacy (export/delete) ▢1.13, /admin/invitations ▢1.1, /admin/imports ▢1.11,
/admin/audit ▢2.3, /admin/settings ▢1.12, /platform (super admin) ▢3.2.
```

### P3: First-time alumnus, AS-BUILT

```text
Create docs/diagrams/03-first-time-claim-current.md (`flowchart TD`) with swimlanes:
"A1/A3 Alumnus", "Next.js app", "Supabase Auth", "Postgres RPC", "Email".
Trace the exact current code path:
1. Landing → clicks "Claim your profile" → /claim
2. Enters email → find_claimable_profile(email) [anon RPC ⛔ F6 enumeration]
3. {Record found?} no → "Request verification" button → /request-access (link to P5) 
   yes → "Create password" (min 8, confirm)
4. supabase.auth.signUp(email, password, emailRedirectTo=/auth/callback?next=/onboarding)
5. {Session returned immediately?} yes (confirm-email OFF ⛔ F8) → /onboarding
   no → confirmation email sent (default SMTP ⛔ F9: only team addresses receive it)
6. Alumnus clicks link → /auth/callback → exchangeCodeForSession
   {Same browser as sign-up?} no → exchange fails silently ⛔ F9 → /onboarding → not signed in → /login
   yes → redirect to `next` (unvalidated ⛔ F7) → /onboarding
7. Onboarding step 1 "Match my alumni record" → claim_my_profile()
   RPC: reads auth.jwt() email, finds unclaimed herzliah record (hard-coded tenant ⚠ F23), sets user_id,
   claimed_at, last_confirmed_at, is_directory_visible=false; inserts membership(alumni),
   availability_flags row, audit_log 'profile_claimed'
   {Matched?} no + not admin → message, dead end ⚠ F15 ; no + admin → may create own profile ; yes → step 2
8. Steps 2 Herzliah → 3 Education → 4 Career (career field required) → 5 Network & privacy
   (directory visibility pre-ticked ⚠ F13; writes live-only columns ⛔ F1)
9. "Save & complete" → 6 separate client writes: update profile, upsert flags, delete+insert education,
   delete+insert experience (errors ignored ⚠ F14) → /me
```

### P4: First-time alumnus, TARGET (invitation-first)

```text
Create docs/diagrams/04-first-time-claim-target.md (`flowchart TD`, swimlanes: "A6 Admin",
"A2→A3 Alumnus", "Next.js app", "Supabase Auth", "Postgres RPC", "Email provider").
All nodes are todo unless they already exist (reuse built/partial from P3 where identical).
Main path (invitation):
  Admin imports CSV (▢1.11) → selects records → create_invitations(ids) (▢1.1) → token hash stored,
  invitation status=sent → branded EN/FR email with /claim?token=…
  Alumnus opens link → peek_invitation(token) shows "Welcome back, <first name>"
  {Token valid?} expired/revoked → "Send me a new link" → request_claim_link → email again
  valid → set password (email pre-filled, locked) + Turnstile → signUp
  → confirmation email → /auth/confirm?token_hash (verifyOtp; works cross-device ▢0.5)
  → /onboarding → claim_with_invitation(token) (▢1.3; JWT email must equal invitation email)
  → wizard steps → consent step: accept privacy policy vX + terms (consents row ▢1.13)
  → visibility choice, default HIDDEN, explicit opt-in (▢1.6)
  → save_my_profile(payload) single transaction (▢1.5) → /me with "Your profile is hidden/visible" banner
Alternate entry (no invite in hand): /claim → enter email → request_claim_link(email) (▢1.2)
  → ALWAYS shows "If we have a record, we've emailed you a link"
  → {match?} (server-side only) yes → send invitation email → joins main path ; no → email says
  "We couldn't find you; request verification" with link → P5 target.
```

### P5: Unmatched alumnus, verification request lifecycle

```text
Create docs/diagrams/05-verification-request.md. Two diagrams in the same file:
(a) "As-built" flowchart: /claim no match → /request-access form (first, last, email, grad year, note)
    → request_alumni_access() [live-only ⛔ F1] → "Request received" page.
    Admin /admin → Verification requests table → Approve → approve_access_request() [⛔ F2: executes for
    anon; outcome undefined ⚠ F16] / Reject → direct table update status=rejected.
    Note: requester gets no email either way ⚠ F16; signed-in unmatched users can't reach the form ⚠ F15;
    requests stored with institution_id NULL are invisible to institution admins under RLS ⚠ F16.
(b) "Target" flowchart (swimlanes A4 Applicant, App, A6 Admin, Postgres, Email), all ▢1.4 unless noted:
    form + Turnstile → request_alumni_access (institution_id set) → status pending → email to Alumni Office
    → admin reviews → searches roster for a likely match (name/class/maiden name)
    {Decision} link to existing record → approve_access_request(id, profile_id) → invitation issued → email
               create new record → approve_access_request(id, null) → record created (status invited) → email
               needs info → status needs_info → email asking for details → applicant replies → back to review
               reject → reject_access_request(id, reason) → decision email
    → invitation joins P4 main path. Every decision writes audit_log.
```

### P6: Returning member: sign in, search, contact

```text
Create docs/diagrams/06-member-search-and-contact.md (`flowchart TD`, swimlanes A5 Member, App,
Postgres, Email).
Sign-in: /login email+password → {ok?} → router.push(next) ⛔ F7 → /directory
  Forgot password branch: resetPasswordForEmail → email → lands on /login with nowhere to set a new
  password ⛔ F10 ; target: /auth/reset-password → updateUser(password) ▢1.7
Directory: server loads all visible profiles (claimed + visible + alumni_only) → client filters:
  text search, Career field, University (⚠ F12 only seed data populates it), Location, Herzliah class,
  Open to, sort (last name / year). Target extras: languages, graduating decade, expertise tags ▢2.5;
  server-side search ▢3.4.
Profile /profile/[id]: about, career field, work history, education, open-to, freshness.
  {Own profile?} yes → "Manage my profile" → /me
  {contact_allowed?} no → no contact card
  yes → AS-BUILT: "Contact alumnus" → reveal_contact_email() [live-only ⚠ F1] → mailto: link.
        Side note node: any member can also read claim_email straight from the REST API ⛔ F3.
        TARGET: relay form → send_relay_message() rate-limited ▢2.2 → email to recipient with
        Reply-To = sender, recipient address never shown → contact_events row ▢1.10 → report/block ▢2.8
```

### P7: Profile management, privacy and data rights

```text
Create docs/diagrams/07-profile-and-privacy.md with:
(a) flowchart: /me sections (Herzliah & contact, Career + previous jobs, Education, Networking
    preferences, Privacy sidebar: Directory visibility, Allow contact) → Save → sets last_confirmed_at
    → 6 client writes ⚠ F14. Mark fields collected in onboarding but NOT editable here ⚠ F22:
    languages, website, work city/country, contact topics, student-contact toggle.
    Target nodes: save_my_profile ▢1.5, visibility enum hidden/members/admins_only ▢1.6,
    export my data ▢1.13, delete my account ▢1.13, notification prefs/unsubscribe ▢2.7.
(b) `stateDiagram-v2` of profile visibility (target): Hidden (default after claim) ⇄ Members ⇄
    AdminsOnly, with who triggers each transition (owner via /me; admin via roster ▢1.12; system
    auto-hide when reconfirmation overdue ▢2.1). Note the as-built uses two fields
    (is_directory_visible + privacy_preset) ⚠ F13.
```

### P8: Institution admin operations

```text
Create docs/diagrams/08-admin-operations.md (`flowchart TD`, swimlanes A6 Admin, Admin UI, Postgres,
Email). Hub-and-spoke from "/admin dashboard".
Login (+ MFA aal2 ▢1.16) → membership check (maybeSingle ⚠ F20) → dashboard stats: total, claimed,
unclaimed, verification requests (built); invites pending, stale profiles, recent activity (▢2.4).
Spokes:
1. Roster: search name/class/career/employer/city + claimed/unclaimed filter (built);
   View profile only when claimed ⚠ F19; edit / suspend / archive / mark deceased / resend invite ▢1.12.
2. Import (as-built): choose CSV → papaparse in browser → 4 columns → direct insert from client
   → whole batch fails on one duplicate ⚠ F18.
   Import (target ▢1.11): upload → server validates → preview with per-row errors → commit
   import_alumni() → import_batches row → "Invite these N records?" → create_invitations ▢1.1.
3. Invitations ▢1.1: list by status (pending/sent/bounced/claimed/expired/revoked), resend, revoke.
4. Verification requests: link to P5.
5. Audit log viewer ▢2.3. 6. Settings ▢1.12: branding, reconfirm interval, career fields/offer types ▢3.5,
   admin users.
```

### P9: Reconfirmation nudge lifecycle (all target)

```text
Create docs/diagrams/09-reconfirmation.md as a `sequenceDiagram` with participants:
Scheduler (pg_cron), Postgres, Email provider, Alumnus, Next.js app. All steps are ▢2.1.
Daily 09:00: select profiles where status=claimed and next_reconfirm_due_at <= now()
→ insert reconfirmation_requests (token hash, reminder_number) → send EN/FR email per preferred locale
with two buttons: "Still accurate" and "Update my profile".
alt Still accurate: GET /confirm?token → confirm_profile(token) → last_confirmed_at=now(),
    next_reconfirm_due_at = now() + institution.reconfirm_interval_months → thank-you page
alt Update: /login → /me → save_my_profile → same timestamps updated
alt No response: +14 days reminder #2, +30 days reminder #3 → after #3 mark stale; if the institution
    setting auto_hide_stale=true, set visibility=hidden and notify the alumnus → admin dashboard
    "stale" count.
Add a note that the as-built only updates last_confirmed_at on save (⚠ F21).
```

### P10: Alumni record lifecycle (state machine)

```text
Create docs/diagrams/10-record-lifecycle.md as `stateDiagram-v2` using the target profile_status enum
(imported, invited, claimed, suspended, archived, deceased) and a composite state inside `claimed`:
Onboarding → Active (with visibility substates Hidden / Visible) → Stale (reconfirm overdue).
Transitions, labelled "trigger · actor · RPC":
[*] → imported : CSV import · admin · import_alumni
[*] → invited : approved access request · admin · approve_access_request
imported → invited : send invite · admin · create_invitations
invited → invited : expired → resend
invited → claimed : claim · alumnus · claim_with_invitation / claim_my_profile
claimed → suspended : admin · set_membership_status ; suspended → claimed : reactivate
any → archived : admin or alumnus deletes account ; any → deceased : admin
Mark which transitions exist today: imported (4-column client import) and claimed via claim_my_profile.
Everything else is todo. Notes: today state is inferred from user_id / claimed_at nulls (§6.6).
```

### P11: Platform admin and new-school onboarding

```text
Create docs/diagrams/11-platform-admin.md (`flowchart TD`).
As-built: developer creates auth user in Supabase dashboard → runs hand-written SQL inserting a
super_admin membership (README) ⚠ (no UI, super admin modelled as a tenant member).
Target ▢3.1 ▢3.2: platform admin console → create institution (name, slug, custom domain, logo, colours,
default locale, reconfirm interval) → seed career_fields/offer_types from global defaults → invite first
institution admin (email) → admin claims account + MFA → admin imports alumni → P8.
Request routing: incoming host → resolve institution by custom_domain or subdomain → tenant context
for every RPC (no 'herzliah' literals ⚠ F23).
```

### P12: Auth and claim technical sequence

```text
Create docs/diagrams/12-auth-sequence.md with TWO `sequenceDiagram`s:
(a) As-built: Browser → Supabase Auth signUp (PKCE verifier cookie stored in THIS browser) → email
    → user clicks in mail app (maybe another device) → GET /auth/callback?code&next → Next route handler
    exchangeCodeForSession(code) (needs verifier cookie; error ignored ⛔ F9) → 302 to next (⛔ F7)
    → RSC /onboarding getUser() → Browser rpc claim_my_profile → Postgres reads auth.jwt()->>'email'
    (trusts confirmed email ⛔ F8) → updates alumni_profiles + memberships + availability_flags + audit_log.
    No middleware refresh ⚠ F11.
(b) Target: middleware.ts refreshes the session on every request ▢0.3; email link →
    GET /auth/confirm?token_hash&type=signup → verifyOtp (works on any device) ▢0.5 → safeNext() ▢0.4
    → claim_with_invitation(token) ▢1.3 → save_my_profile ▢1.5.
```

---

## Database prompts

### D1: Current schema ERD (as it exists in production)

```text
Create docs/diagrams/20-erd-current.md as Mermaid `erDiagram`.
Derive every table and column from supabase/migrations/001–004 (ignore 002 seed data) plus the live-only
additions listed in Prompt 0. Include auth.users as an external entity (id only).
Tables: institutions, institution_memberships, alumni_profiles, availability_flags, alumni_experience,
alumni_education, invitations, access_requests, audit_log.
For each column: type and PK / FK / UK markers, plus a quoted comment for live-only columns
("live-only, not in migrations") and for unused tables ("unused by app").
Live-only column types are inferred from app usage: work_city text, work_country text, contact_topics text,
student_contact_allowed boolean, student_questions boolean.
Relationships with correct cardinality: institutions ||--o{ every tenant table;
auth.users |o--o| alumni_profiles (user_id null until claimed); alumni_profiles ||--o| availability_flags;
alumni_profiles ||--o{ experience/education/invitations; auth.users ||--o{ memberships/access_requests/audit_log.
Below the ERD, add a Markdown table "RLS policies today": table | policy name | operation | rule (plain
English) | issue (F3/F4/F5/F2 where applicable). Also list the RPCs with SECURITY DEFINER, who can execute
them (anon/authenticated) and the finding ids.
```

### D2: Target schema ERD (section 6)

```text
Create the target model from docs/PRODUCT_ANALYSIS.md §6 as FIVE erDiagram files:
  21-erd-target-overview.md: every table name and relationship only (no columns), to fit on one screen
  22-erd-target-identity.md: institutions, platform_admins, institution_memberships, auth.users, consents
  23-erd-target-profile.md: alumni_profiles, alumni_private, alumni_education, alumni_experience,
      career_fields, offer_types, profile_offers, profile_tags
  24-erd-target-onboarding.md: invitations, access_requests, import_batches (+ alumni_profiles, institutions
      as stubs)
  25-erd-target-engagement.md: contact_events, messages, reconfirmation_requests, reports, audit_log,
      student_profiles (+ stubs)
Use exact column names and enums from §6.2/§6.3. Mark new tables with a comment "NEW", and changed
tables with "CHANGED" on the changed columns. Under each diagram add a short table of the enum types
used and the RLS rule for each table from §6.4.
```

### D3: Current → target migration map

```text
Create docs/diagrams/26-migration-map.md as `flowchart LR`: left subgraph "Current", right subgraph
"Target", one edge per mapping in §6.6 (label edge with transform: "move", "merge", "split rows",
"lookup FK", "drop"). Then list, as an ordered checklist, the migration files needed:
005_capture_live_schema (db pull) → 006_security_hardening (F2–F5) → 007_alumni_private_split →
008_visibility_and_status_enums → 009_lookup_tables_and_profile_offers (backfill from availability_flags
and CAREER_FIELDS) → 010_education_single_source (backfill universities[] to alumni_education) →
011_invitations_and_requests_v2 → 012_engagement_tables → 013_platform_admins, each with a one-line
purpose and the backfill/rollback note.
```

### D4: Permissions matrix (HTML, not Mermaid)

```text
In docs/diagrams/index.html add a "Permissions" page: an HTML table with rows = tables and RPCs, columns =
Visitor, Member, Owner, Institution admin, Platform admin. Cells show allowed operations. Add a toggle
"Current / Target": Current comes from the SQL policies in migrations 001/003/004 (highlight the cells
behind F2–F6 in red with a tooltip naming the finding); Target comes from PRODUCT_ANALYSIS §6.4–6.5.
Make it readable in light and dark mode and at 375px wide (horizontal scroll inside the table only).
```
