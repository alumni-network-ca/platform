# Contributing

How we plan, build, review and release the Alumni Network platform. The rules are short on purpose. Follow them even when working alone, because they are what lets the other partner (or a future developer) pick the work up.

## Planning

- All work lives on the **GitHub Project** for `alumni-network-ca/platform` and in its issues.
- The backlog's source of truth is `.github/project/backlog/*.yml`. To add or change scope, edit the YAML, open a PR and run `npm run backlog:seed`. Ticking checkboxes and commenting on issues directly is fine.
- Product decisions are `type:decision` issues assigned to Noah and recorded in [docs/DECISIONS.md](docs/DECISIONS.md) and [docs/adr/](docs/adr/).

## Branches

| Branch | Purpose | Deploys to |
|---|---|---|
| `main` | Production. Only release PRs from `dev`. Tagged `vX.Y.Z`. | production |
| `dev` | Default branch, integration | staging |
| `<type>/<issue#>-<slug>` | One issue per branch, cut from `dev` | PR preview |

`<type>` is one of `feat`, `fix`, `chore`, `docs`, `test`, `refactor` or `security`. Example: `feat/42-invitation-claim`.

## Commands

| Command | What it does |
|---|---|
| `npm run check` | Lint + typecheck + format check + unit tests. Run it before every PR (CI runs the same). |
| `npm test` / `npm run test:watch` | Vitest unit and component tests (`*.test.ts(x)` next to the code) |
| `npm run test:e2e` | Playwright end-to-end and axe accessibility tests in `e2e/`, desktop and mobile. Starts `next dev` automatically. First run `npx playwright install chromium`. |
| `npm run test:db` | pgTAP database tests (`supabase/tests/`); needs the local Supabase stack (Docker) |
| `npm run db:types` | Regenerates `lib/database.types.ts` from the local database. Run it after every migration and commit the result. |
| `npm run seed:perf` | Adds 10,000 alumni per school to the local stack for performance checks (`-- --count N` for fewer). Refuses any non-local database. |
| `npm run admin:bootstrap -- --email <email>` | Makes a verified account a system admin. Locally it uses the running stack; for staging or production set `SUPABASE_URL` and `SUPABASE_SECRET_KEY`. |
| `npm run lint:fix` / `npm run format` | Auto-fix lint issues / format everything |
| `npm run backlog:check` / `npm run backlog:seed` | Preview / apply backlog YAML changes to GitHub |

A pre-commit hook (simple-git-hooks + lint-staged) lints and formats staged files. It's installed by `npm install`.

## Continuous integration

`.github/workflows/ci.yml` runs on every PR into `dev` or `main`. Docs-only changes are skipped. Four jobs run in parallel, and all must be green before merging:

| Job | What it runs |
|---|---|
| Lint, types, format, unit | `npm run lint`, `typecheck`, `format:check`, `test`, `npm audit --omit=dev --audit-level=critical` |
| Database | `supabase db start` (migrations + seed), `supabase test db` (pgTAP), then `npm run db:types` must leave `lib/database.types.ts` unchanged |
| Build and end-to-end | Local Supabase stack, `npm run build`, then Playwright (desktop + mobile, axe). On failure, the report is uploaded as an artifact. |
| Secret scan | gitleaks over the full git history |

To reproduce a CI failure locally, run the same commands. The Supabase CLI version is pinned in the workflow (`SUPABASE_CLI_VERSION`).

## Workflow for an issue

1. **Pick:** take an issue in *Ready*, assign yourself, and move it to *In progress*.
2. **Branch** from the latest `dev`.
3. **Commit** using [Conventional Commits](https://www.conventionalcommits.org/), e.g. `feat(onboarding): claim profile from invitation`.
4. **Open a PR into `dev`** using the template. Put `Closes #<issue>` in the body.
5. **Review:**
   - CI must be green.
   - Self-review the diff and run `/code-review`.
   - Also run `/security-review` when the change touches auth, RLS, RPCs, exports, email links or tokens.
6. **Merge:** squash merge. The branch is deleted automatically and the issue closes.
7. **Verify** the change on staging, then move the card to *Done*.

## Releases

1. Open a PR `dev` → `main` titled `release: vX.Y.Z` and list the issues and migrations it contains.
2. Demo the change on staging. **Noah approves the release PR.**
3. Merge with a **merge commit** (not squash), so `dev` and `main` keep a shared history.
4. Apply the database migrations, then deploy and smoke-test production.
5. Tag `vX.Y.Z` and publish release notes.

## Definition of Ready

- The problem, the requirement IDs and the acceptance criteria are written down.
- Dependencies are done, or explicitly stubbed.
- Any product decision the issue needs is approved.

## Definition of Done

- [ ] The acceptance criteria are met and demonstrated on staging.
- [ ] Tests are added at the right level: unit (Vitest), database (pgTAP), end-to-end (Playwright).
- [ ] Every user-facing string exists in **both** `en` and `fr`.
- [ ] Authorization is enforced in the database or server, not only by hiding UI.
- [ ] Migrations are forward-only, reviewed, and their rollback or recovery notes are in the PR.
- [ ] No secrets, tokens or personal data in code, URLs, logs or analytics.
- [ ] Docs are updated (README, runbooks, ADRs, `docs/TRACEABILITY.md` where relevant).
- [ ] CI is green and the PR is merged.

## Database rules

- Every schema change is a migration file (`supabase migration new <name>`). **Never** make changes in the dashboard SQL editor.
- Never edit a migration that has already been applied. Write a new one instead.
- Query the database through `createClient()` from `lib/supabase/{server,client}.ts`, typed from the generated `lib/database.types.ts`. Where the generator is too loose (jsonb results, nullable function columns), narrow the type in `lib/database.ts`. `createLegacyClient()` exists only for the pages still on the legacy schema, listed in `eslint.config.mjs`.
- Every table holding institution data has `institution_id`, RLS enabled, and pgTAP tests for each role.
- Every `security definer` function sets `search_path`, checks permissions in its first statement, and revokes `execute` from `public`/`anon` unless anon access is intended.
- A new client RPC needs three tests: refused across schools and above its role (`03_rpc_matrix`), one audit row when it succeeds (`04_audit`), and its name in the `04_audit` list of client-callable functions, which fails until it is added.

## Security rules

- The Supabase **secret key** is only used in `server-only` modules, and only for jobs, webhooks and invitation sending.
- Tenant identity comes from the request host plus the user's membership, never from a client-supplied ID.
- Report vulnerabilities privately to the maintainers. Do not open a public issue.
