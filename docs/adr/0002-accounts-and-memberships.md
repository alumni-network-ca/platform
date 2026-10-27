# 0002: Every school is independent: per-school memberships, profiles and sessions

- **Status:** Accepted (DEC-13, 2026-10-26) · **Date:** 2026-10-14 · **Requirements:** MT2, MT5

## Context

A person may have attended more than one participating school. The PDF requires each membership, profile visibility and role to stay explicitly scoped, with no cross-institution sharing (MT5). The partners decided that every school is independent: signing in at `herzliah.alumninetwork.ca` gives access to Herzliah only.

## Decision

- **Login identity:** Supabase Auth allows one user per email address per project, so `auth.users` holds one identity per email. It carries no school data and grants nothing on its own.
- **Everything else is per school:**
  - **Membership:** one row per (institution, user) in `institution_memberships`, with its own role, status and approval.
  - **Profile:** one per (institution, user) in `alumni_profiles`. Never shared, linked or merged across schools.
  - **Sign-up and approval:** joining a second school is a new sign-up at that school's address, approved by that school.
  - **Session:** cookies are scoped to the school's subdomain, so a session at one school is not valid at another.
- **System admins** live in a separate `platform_admins` table. They are not school members (see ADR 0005).

## Consequences

- No query ever joins profiles across institutions, and no page shows that a person belongs to another school.
- The one thing a person in two schools shares is their email identity. Sign-in is by a code sent to that email (ADR 0014), so joining a second school uses the same form as everyone else and reveals nothing about the other school.
- Deleting a profile removes that school's membership and profile. The login is deleted only when no membership is left.
