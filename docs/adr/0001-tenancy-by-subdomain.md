# 0001: Tenancy resolved by subdomain

- **Status:** Accepted (DEC-14, 2026-10-26) · **Date:** 2026-10-14 · **Requirements:** MT1, MT3, MT4

## Context

One application and one database serve every institution (MT1). The MVP hard-codes `'herzliah'` in SQL (F23). Schools expect their own branded entry point, and the partners want addresses like `herzliah.alumninetwork.ca`.

## Decision

- Each institution gets a subdomain of `alumninetwork.ca`: `<slug>.alumninetwork.ca`.
- The Next.js proxy/middleware maps the request host to an institution slug, then the server resolves it to an `institution_id` and caches it briefly. An unknown or suspended host returns 404.
- The root domain `alumninetwork.ca` serves the public "for schools" page and the system-admin console (`/console`).
- **The resolved tenant is a routing hint, never proof of access.** Every query is still restricted by RLS through `auth.uid()` and memberships (MT3), and every RPC re-checks membership in the host's institution.
- Environments, set by `ROOT_DOMAIN`:
  - local: `herzliah.localhost:3000` (`ROOT_DOMAIN=localhost`, the default)
  - staging: `*.staging.alumninetwork.ca`, deployed from `dev`
  - Vercel PR previews: a `tenant` cookie fallback (set with `?tenant=<slug>`), accepted only when `VERCEL_ENV=preview`; without it, `PREVIEW_DEFAULT_SCHOOL`
- Implementation (FND-07): `proxy.ts` resolves the host with `lib/tenant/host.ts`, looks the school up through `public_school` (cached for a minute), and passes it to server components in the `x-school` request header, always overwriting a client-sent value. Pages read it with `getSchool()` / `requireSchool()`, client components with `useSchool()`. The root domain is served from `app/site`.
- DNS sits on Vercel nameservers, because Vercel's wildcard domains require them.

## Consequences

- No school literal remains in code or SQL, and adding a school becomes a data operation (MT6).
- Auth cookies are scoped per subdomain (see ADR 0002).
- A future custom domain per school (e.g. `alumni.herzliah.ca`) can be added later through an `institutions.custom_domain` lookup.
