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

### Two databases

| Database | Used by | Where |
|---|---|---|
| **Cloud dev database** (Supabase project `alumni-network-staging`, ca-central-1) | `npm run dev`, through the committed [`.env.development`](.env.development) | Supabase cloud, shared by the team and by the `dev` deployment. Every merge into `dev` applies new migrations to it ([runbook](docs/runbooks/database-migrations.md)). |
| **Local stack** (Supabase CLI in Docker) | `npm run test:db`, `npm run test:e2e`, `npm run seed:perf`, `npm run db:types` | Your machine: `supabase start` / `supabase stop` |

Tests create and delete data, so they never touch the cloud dev database: Playwright starts its own server with the local stack's keys. Put only fictional people in the cloud dev database.

### First run

```bash
npm install                      # also installs the pre-commit hook
npm run dev                      # runs on the cloud dev database, no setup needed
```

Open **http://herzliah.localhost:3000**. The subdomain selects the school: `test-school.localhost:3000` is the second school, and plain `localhost:3000` is the root site (the page for schools). A session belongs to one school's address, so signing in at one does not sign you in at the other.

On the cloud dev database, sign-in codes go out through Supabase's built-in email, which only delivers to the project team's addresses and a few times an hour; `.test` addresses never receive one. Sign in with your own team address, or choose "Sign in with a password" on an account that has one (set it at `/account/password`).

The platform console is at **http://localhost:3000/console** (the root site has its own sign-in): sign in as a platform admin to list, create and suspend schools, invite their first school admin and open support access. On a PR preview, add `?tenant=root` to reach it.

A migration on your branch reaches the cloud dev database only after the merge into `dev`. Until then, run the app on the local stack: start it, then copy `.env.example` to `.env.local` with the values from `supabase status -o env` (`.env.local` overrides `.env.development`).

### Tests on the local stack

```bash
supabase start                   # local Postgres, Auth, Studio and Mailpit (first run pulls ~2-3 GB of images)
npm run test:db                  # pgTAP database tests
npm run test:e2e                 # stop `npm run dev` first: the tests start their own server on the local stack
supabase stop
```

`supabase start` applies `supabase/migrations/*` and then `supabase/seed.sql`. The seed contains fictional demo alumni for both schools plus the test accounts listed below and at the top of [supabase/seed.sql](supabase/seed.sql). On the local stack, sign-in codes arrive in Mailpit (http://127.0.0.1:54324), and every seed account has the local-only password `LocalDev-Passw0rd` (ADR 0015); `system@alumninetwork.test` is the platform admin.

### Local stack services

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
npm run test:e2e                 # Playwright end-to-end + accessibility tests (stack running, `npm run dev` stopped)
supabase stop                    # stop the local stack
```

## Current state

The database runs the **v2 schema** ([data model](docs/architecture/data-model.md)): three migrations in `supabase/migrations/` (schema, access rules, RPCs), with the legacy MVP migrations kept in `supabase/legacy/` for history. The app is the V1–V4 MVP being rebuilt onto it, issue by issue. The directory already reads v2 through clients typed from the generated `lib/database.types.ts`. Sign-in is by emailed code; new people sign up at `/join` and wait on their account page until the school approves them. Onboarding, the profile editor and the admin pages still use the old tables through an untyped `createLegacyClient()`, and fail locally until their M2 issues rewire them (each file names its issue).

Test accounts on the local stack (sign in with a code from Mailpit). After sign-in each one lands on its own home page:

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
| `newmember@herzliah.test` | Approved, has not finished onboarding |
| `admin@test-school.test` | School admin of a second school (isolation tests) |
| `reviewer@test-school.test` | Reviewer of the second school |
| `alumni@test-school.test` | Alumnus of the second school |
| `pending@test-school.test` | Waiting for approval at the second school |
| `outsider@alumninetwork.test` | Verified account with no school |
| `system@alumninetwork.test` | System admin |

The seed also holds 200 published Herzliah alumni and 20 at the second school (fictional, `@example.test`).

## Security

Never commit secrets: `.env*` files are ignored except `.env.example` (no values) and `.env.development` (the cloud dev database's URL and publishable key, which every browser receives anyway). The secret scan allows Supabase publishable keys only ([.gitleaks.toml](.gitleaks.toml)). The Supabase **secret key** must never be exposed to the browser. The app reads environment variables only through `config/env/` (public, server, secrets), and shared settings such as cookie names live in `config/` ([ADR 0017](docs/adr/0017-configuration.md)); lint rejects `process.env` anywhere else in app code. Report vulnerabilities privately (see `.github/ISSUE_TEMPLATE/config.yml`).
