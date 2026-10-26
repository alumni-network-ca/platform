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

Open **http://herzliah.localhost:3000** (the `herzliah` subdomain selects the tenant).

`supabase start` applies `supabase/migrations/*` and then `supabase/seed.sql`. The seed contains 50 fictional demo alumni plus local test accounts. Their emails and the local-only password are listed at the top of [supabase/seed.sql](supabase/seed.sql).

### Local services

| Service | URL |
|---|---|
| App | http://herzliah.localhost:3000 |
| Supabase API | http://127.0.0.1:54321 |
| Supabase Studio (database browser) | http://127.0.0.1:54323 |
| Mailpit (catches every email sent locally) | http://127.0.0.1:54324 |
| Postgres | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |

### Everyday commands

```bash
supabase db reset                # rebuild the local DB from migrations + seed
supabase migration new <name>    # new schema change; never edit applied migrations
npm run check                    # lint + typecheck + format check + unit tests
npm run test:db                  # pgTAP database tests (stack must be running)
npm run test:e2e                 # Playwright end-to-end + accessibility tests
supabase stop                    # stop the local stack
```

## Current state

The code is the V1–V4 MVP, being rebuilt to the requirements on the board. Until FND-04 lands a reviewed v2 baseline, the local schema comes from the legacy migrations `001`, `003` and `004`. The legacy *production* database also holds objects that were never committed (finding F1), so onboarding, contact and access requests can fail locally. That's expected.

## Security

Never commit secrets: `.env*.local` is ignored, and only `.env.example` (no values) is tracked. The Supabase **secret key** must never be exposed to the browser. Report vulnerabilities privately (see `.github/ISSUE_TEMPLATE/config.yml`).
