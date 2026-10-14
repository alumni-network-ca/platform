# 0010: Testing strategy

- **Status:** Accepted · **Date:** 2026-10-14 · **Requirements:** QA1–QA4, HL4–HL7

## Decision

| Level | Tool | Scope | Runs |
|---|---|---|---|
| Static | ESLint, `tsc --noEmit`, Prettier, i18n key parity | all code | pre-commit, CI |
| Unit | Vitest + Testing Library | validators, tenant resolver, CSV mapping, formula neutralization, email rendering, components | CI |
| Database | pgTAP (`supabase test db`) | RLS and RPC permissions for **2 institutions × every role** (anon, pending, alumni, reviewer, admin, owner, platform admin with and without a grant); protected columns; audit writes; idempotent jobs | CI |
| Integration | Vitest + supabase-js against local Supabase | direct REST/RPC requests as each role: the "change the id in the request" attacks | CI |
| End-to-end | Playwright (EN and FR projects, desktop and mobile viewports) + Mailpit + @axe-core/playwright | full user and admin journeys, email links, accessibility | CI on PRs to `dev` and `main` |
| Performance | seed script (10k alumni, 2 tenants) + `explain analyze` + k6 smoke | directory search, import, email batches | before launch (QA-06) |

- **Environment.** Docker Desktop and the Supabase CLI run the full stack locally. CI uses the same stack on GitHub Actions.
- **Data.** Tests use seeded fictional data only. They never touch staging or production data.
- **Traceability.** Every launch requirement in `docs/TRACEABILITY.md` points to the test or evidence that proves it.
