# 0022: School page for links and contacts

- **Status:** Accepted · **Date:** 2026-11-24 · **Related:** SCH-01, [0005](0005-authorization-model.md), [0018](0018-school-config-cache.md), [0021](0021-school-features.md)

## Context

Schools want signed-in alumni to find their official links in one place: the school website, a donate link, social
accounts, a short About text, the address and the alumni office contact. Schools differ in what they have, so every
field is optional. The platform never handles payments (as with fundraising posts, EPIC-POSTS).

## Decision

- **A `school_pages` table, one optional row per school**, not columns on `institutions`: `institutions` feeds
  `public_school()` and the cached school config, and this content is for signed-in members only.
- **Read by members, written by school admins.** The read policy uses `directory.use` (alumni, reviewers, school
  admins, so an alumnus needs an active profile) plus `settings.manage` and system admins. Nobody has table write
  grants; `set_school_page(inst, page)` (`settings.manage`) replaces the whole page and writes a `school.page_updated`
  audit row listing the fields that are filled. Reviewers and alumni are refused.
- **Links are https only, enforced in the database.** `is_https_url` accepts `https://host.tld/path` with no
  `user:password@`, no spaces and at most 500 characters; `is_social_links` accepts only `facebook`, `instagram`,
  `linkedin`, `youtube` and `x`. A direct call cannot store `javascript:` or `http:` links.
- **The donate link is a standing link to the school's own page.** Campaign-specific fundraising stays in school posts.
  The page shows the same "you will leave this site" note as fundraising posts. No click tracking.
- **The map is a plain link.** No embedded map and no third-party script.
- **About is stored in English and French; the app falls back to the other language** when one is empty. An empty page
  is valid; the page and its nav entry are hidden when no field is filled in.

## Consequences

- Adding a field is a column plus a line in `set_school_page`; a new social network is one key in `is_social_links`.
- No feature flag (ADR 0021): every school gets the page, and an empty one is invisible.
- The admin form (SCH-02) and alumni page (SCH-03) are not built yet; the alumni screen is drawn as `SchoolPage` (3.7).
