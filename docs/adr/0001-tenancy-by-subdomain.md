# 0001: Tenancy resolved by subdomain

- **Status:** Proposed (DEC-14) · **Date:** 2026-10-14 · **Requirements:** MT1, MT3, MT4

## Context

One application and one database serve every institution (MT1). The MVP hard-codes `'herzliah'` in SQL (F23). Schools expect their own branded entry point, and the partners want addresses like `herzliah.alumni-network.ca`.

## Decision

- Each institution gets a subdomain of `alumni-network.ca`: `<slug>.alumni-network.ca`.
- The Next.js proxy/middleware maps the request host to an institution slug, then the server resolves it to an `institution_id` and caches it briefly. An unknown or suspended host returns 404.
- The root domain `alumni-network.ca` serves the public "for schools" site and the platform console (`/console`).
- **The resolved tenant is a routing hint, never proof of access.** Every query is still restricted by RLS through `auth.uid()` and memberships (MT3), and every RPC re-checks membership in the host's institution.
- Environments:
  - local: `herzliah.localhost:3000`
  - staging: `*.staging.alumni-network.ca`, deployed from `dev`
  - Vercel PR previews: a `tenant` cookie fallback, accepted only when `VERCEL_ENV=preview`
- DNS sits on Vercel nameservers, because Vercel's wildcard domains require them.

## Consequences

- No school literal remains in code or SQL, and adding a school becomes a data operation (MT6).
- Auth cookies are scoped per subdomain (see ADR 0002).
- A future custom domain per school (e.g. `alumni.herzliah.ca`) can be added later through an `institutions.custom_domain` lookup.
