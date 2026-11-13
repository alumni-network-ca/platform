# 0018: School config read once, cached across requests

- **Status:** Accepted · **Date:** 2026-11-03 · **Related:** FND-02, ADM-08

## Context

Every page re-read values that almost never change, through the visitor's session: career fields and networking
options (profile, directory, home, onboarding, admin record), and the role → permission table (every admin page and
action, as a separate step after the account read). Branding travelled from `src/proxy.ts` in the `x-school` header,
cached for 60 s in each server's memory: no way to clear it after a change, and each school needs its own branding.

## Decision

- **One read per school:** `school_config(p_inst)` returns branding, career fields, offer types (the platform's and the
  school's own, inactive ones included) and the role → permission table. It returns null unless the school is active.
- **Public, like `public_school`:** anon may call it, because the cache is shared by every visitor and never carries a
  session. None of it is personal data. This makes option labels and the permission table readable without signing in
  (they were members-only through RLS).
- **Cached with `unstable_cache`** in `src/lib/tenant/config.ts`: shared by all servers on Vercel, deduplicated per request
  with React `cache`. Key: the build's commit, so a deploy starts fresh. Tag: `school-config:<id>`. Safety net: 5 min.
  `'use cache'` replaces it once the app turns on `cacheComponents`; only that file changes.
- **Branding comes from the cache, not the header.** `getSchool()` adds it to the proxy's school, so every
  `schoolBranding()` caller gets the current value.
- **Changes:** an action that edits branding, options or a school's status calls `refreshSchoolConfig(id)`, which
  clears the entry on every server; the next request reads the database. A change made in SQL or by a migration run
  on its own shows within 5 minutes. The school's name and suspension still come from the proxy (60 s).
- `update_school_settings` cleans branding with `clean_branding()`, as school creation does, since branding now
  reaches every page.

## Consequences

- Pages no longer query `career_fields`, `offer_types` or `role_permissions`; admin pages lose one sequential round
  trip.
- The app's own permission checks (hiding links, `requireStaff`) can lag a migration that changes `role_permissions`
  by up to 5 minutes. The database is unaffected: RLS and the RPCs read the table live (ADR 0005).
- Anything that edits these values must call `refreshSchoolConfig`, or the change waits for the safety net.
