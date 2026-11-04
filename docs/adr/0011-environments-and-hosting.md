# 0011: Environments, hosting and cost

- **Status:** Proposed (BIZ-05 budget approval; domain decided in DEC-14) · **Date:** 2026-10-14 · **Requirements:** S8, S9, D1, D3, §9

## Decision

### Ownership

- All services are owned by business accounts tied to a shared Alumni Network admin address, never to one person.
- Both partners are owners, and MFA is on everywhere.

### Environments

| Env | App | Database | Email | Domain |
|---|---|---|---|---|
| development | `next dev` | staging project (shared, via the committed `.env.development`) | Supabase built-in email | `*.localhost:3000` |
| tests | Playwright's own `next dev`, CI | Supabase CLI (Docker) | Mailpit | `*.localhost:3000` |
| preview | Vercel PR previews | staging project | Mailpit / allow-list | `*.vercel.app` + tenant cookie |
| staging | Vercel, branch `dev` | Supabase staging (free org) | Resend, allow-list only | `*.staging.alumninetwork.ca` |
| production | Vercel, branch `main` | Supabase production (Pro org, **ca-central-1**) | Resend | `*.alumninetwork.ca` |

- Development runs on one shared cloud database, the staging project, so every checkout sees the same schools and accounts (amended 2026-11-03). Automated tests create and delete data, so they run only on the local Docker stack, and Playwright passes that stack's keys to its own server. A migration reaches the shared database when it is merged into `dev`; until then it is tried on the local stack.
- Hosting the production database in Canada (ca-central-1) simplifies the Law 25 assessment. The privacy assessment still covers Vercel, Resend and Sentry (LEGAL-04).
- Secrets live only in the Vercel and Supabase dashboards and GitHub Actions secrets, scoped per environment. `.env.example` documents the names.

### Monthly cost at launch

| Service | Cost |
|---|---|
| Supabase Pro (daily backups, no pausing) | $25 |
| Vercel Pro (commercial use, cron) | $20 |
| Resend | free → $20 |
| Sentry, Cloudflare Turnstile, uptime monitor | free tiers |
| Domain | about $2/month amortized |
| **Total** | **about $47–67/month** |

Development and staging run on free tiers until just before the pilot.
