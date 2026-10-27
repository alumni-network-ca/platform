# 0003: Clean v2 schema baseline and migration conventions

- **Status:** Accepted · **Date:** 2026-10-14 · **Requirements:** MT2, D1, D2, F1

## Context

- Migrations 001–004 have drifted from the live database (F1), mix in seed data, and carry RLS gaps (F3–F5).
- Production holds only the 50 fictional demo profiles and test accounts, with no real alumni.
- The platform is moving to new business-owned Supabase projects in any case (ADR 0011).

## Decision

- The legacy migrations 001/003/004 are archived in `supabase/legacy/` for history (done in FND-04).
- The **v2 baseline** implements [docs/architecture/data-model.md](../architecture/data-model.md) as three reviewed migrations: schema, access rules (RLS and grants) and RPCs.
- New migrations use Supabase CLI timestamped names (`supabase migration new`), so parallel branches don't collide.
- Migrations are forward-only. Seed and demo data live in `supabase/seed.sql`, applied only to local and staging environments.
- Generated TypeScript types (`lib/database.types.ts`) are regenerated in CI and must match the committed copy.

## Consequences

- There is no in-place backfill of real data. Herzliah alumni join through the sign-up link and admin approval (ADR 0004); nothing is imported at launch.
- The live-only RPCs are still captured and reviewed for the audit record (AUDIT-03), but are not carried forward.
