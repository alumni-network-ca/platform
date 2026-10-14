# 0002: One account, per-institution memberships and profiles

- **Status:** Proposed (DEC-13) · **Date:** 2026-10-14 · **Requirements:** MT2, MT5

## Context

A person may have attended more than one participating school. The PDF requires each membership, profile visibility and role to stay explicitly scoped, with no cross-institution sharing (MT5).

## Decision

- **Account:** one Supabase Auth user per email address (`auth.users`).
- **Membership:** one row per (institution, user) in `institution_memberships`, carrying the role and status.
- **Profile:** one per (institution, user) in `alumni_profiles`. Profiles are never shared or merged across institutions.
- **Sessions** are cookie-scoped to the subdomain. A person in two schools signs in to each separately. This is stricter isolation, at the cost of a little convenience.
- **Platform admins** live in a separate `platform_admins` table. They are not institution members (see ADR 0005).

## Consequences

- No query ever joins profiles across institutions.
- A shared parent-domain cookie can be revisited later if users ask for single sign-on across schools.
