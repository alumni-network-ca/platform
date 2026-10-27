# Alumni Network platform

A private, verified professional network for school alumni. Each school (a *tenant*) gets its own branded space at `<school>.alumninetwork.ca`, and graduates can only see and contact their own school's alumni. **Herzliah High School (Montreal)** is the first tenant; the pilot targets 2026-12-01.

**Stack:** Next.js (App Router) · React · TypeScript · Supabase (Postgres, row-level security, Auth) · Vercel.

| Where | What |
|---|---|
| [Project board](https://github.com/orgs/alumni-network-ca/projects/1) | Every task, decision and milestone |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Branches, PRs, Definition of Done, releases, commands |
| [docs/adr/](docs/adr/) · [docs/DECISIONS.md](docs/DECISIONS.md) | Architecture decisions and the decision register |
| [docs/PRODUCT_ANALYSIS.md](docs/PRODUCT_ANALYSIS.md) | Audit of the initial MVP (findings F1–F27) and the target data model |
| [documentation/diagrams/](documentation/diagrams/) | User flows and ERDs |

## Getting started

### Prerequisites

- **Node.js 22**
- **Docker Desktop** (WSL 2 backend on Windows), running
- **Supabase CLI** 2.121 or newer (`supabase --version`)

### First run

```bash
npm install                      # also installs the pre-commit hook
supabase start                   # local Postgres, Auth, Studio and Mailpit (first run pulls ~2-3 GB of images)
cp .env.example .env.local       # then paste the publishable key from `supabase status -o env`
npm run dev
```

Open **http://herzliah.localhost:3000**. The subdomain selects the school: `test-school.localhost:3000` is the second school, and plain `localhost:3000` is the root site (the page for schools). A session belongs to one school's address, so signing in at one does not sign you in at the other.

`supabase start` applies `supabase/migrations/*` and then `supabase/seed.sql`. The seed contains fictional demo alumni for both schools plus local test accounts. Their emails and the local-only password are listed at the top of [supabase/seed.sql](supabase/seed.sql).

### Local services

| Service | URL |
|---|---|
| App (Herzliah) | http://herzliah.localhost:3000 |
| App (second school) | http://test-school.localhost:3000 |
| Supabase API | http://127.0.0.1:54321 |
| Supabase Studio (database browser) | http://127.0.0.1:54323 |
| Mailpit (catches every email sent locally) | http://127.0.0.1:54324 |
| Postgres | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |

### Everyday commands

```bash
supabase db reset                # rebuild the local DB from migrations + seed
supabase migration new <name>    # new schema change; never edit applied migrations
npm run db:types                 # regenerate lib/database.types.ts after a migration
npm run seed:perf                # add 10,000 alumni per school (local only; db reset removes them)
npm run bench:directory          # time the directory search (p50/p95) after seed:perf
npm run check                    # lint + typecheck + format check + unit tests
npm run test:db                  # pgTAP database tests (stack must be running)
npm run test:e2e                 # Playwright end-to-end + accessibility tests
supabase stop                    # stop the local stack
```

## Current state

The database runs the **v2 schema** ([data model](docs/architecture/data-model.md)): three migrations in `supabase/migrations/` (schema, access rules, RPCs), with the legacy MVP migrations kept in `supabase/legacy/` for history. The app is the V1–V4 MVP being rebuilt onto it, issue by issue. The directory already reads v2 through clients typed from the generated `lib/database.types.ts`. Onboarding, the profile editor, admin pages, claim and request-access still use the old tables through an untyped `createLegacyClient()`, and fail locally until their M2 issues rewire them (each file names its issue).

Local test accounts (password in the `supabase/seed.sql` header, local only):

| Account | Role |
|---|---|
| `admin@herzliah.test` | Herzliah school admin |
| `reviewer@herzliah.test` | Herzliah reviewer |
| `alumni@herzliah.test` | Herzliah alumnus (published) |
| `pending@herzliah.test` | Signed up, waiting for approval |
| `needsinfo@herzliah.test` | Asked for more information, not answered yet |
| `rejected@herzliah.test` | Sign-up rejected |
| `withdrawn@herzliah.test` | Withdrew their sign-up |
| `suspended@herzliah.test` | Alumnus whose record the school suspended |
| `admin@test-school.test` | School admin of a second school (isolation tests) |
| `reviewer@test-school.test` | Reviewer of the second school |
| `alumni@test-school.test` | Alumnus of the second school |
| `pending@test-school.test` | Waiting for approval at the second school |
| `outsider@alumninetwork.test` | Verified account with no school |
| `system@alumninetwork.test` | System admin |

The seed also holds 200 published Herzliah alumni and 20 at the second school (fictional, `@example.test`).

## Security

Never commit secrets: `.env*.local` is ignored, and only `.env.example` (no values) is tracked. The Supabase **secret key** must never be exposed to the browser. Report vulnerabilities privately (see `.github/ISSUE_TEMPLATE/config.yml`).
