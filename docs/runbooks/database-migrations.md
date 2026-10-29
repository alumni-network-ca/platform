# Database migrations on staging and production

`supabase/migrations/*` is the schema. CI applies every migration to a fresh database on each PR (with the seed and the pgTAP suite). The **Migrate databases** workflow (`.github/workflows/migrate.yml`, FND-16) applies them to the hosted databases:

| Database | When | How |
|---|---|---|
| Staging | Every merge into `dev` that changes `supabase/migrations/` (or the workflow) | Automatic |
| Production | When a release is merged into `main` | By hand: Actions → Migrate databases → Run workflow, branch `main`, target `production`, type `production` to confirm |

Each run links the project, prints what it will apply (`supabase db push --dry-run`), applies it, and lists the migrations on both sides. `supabase db push` refuses a database whose history has a migration the repo doesn't, so a database changed by hand stops the run instead of drifting further. The seed (`supabase/seed.sql`) is never pushed: it is for local and CI only.

Vercel deploys the app at the same time, so a migration must work with the code that is already running for the minute between the two. Expand, then contract: add a column or function in one release and stop using the old one in a later one. Never drop or rename something the running code still reads.

## One-time setup

The workflow needs one secret and one variable per database. No database password is stored: the CLI signs in with a temporary role through the Management API.

1. Create a Supabase access token at https://supabase.com/dashboard/account/tokens, named `GitHub Actions: alumni-network-ca/platform`. A personal token reaches every project in its owner's organizations; once the business organization exists (BIZ-04), create it from the shared admin account, and rotate it yearly.
2. Store it as a repository secret. The command prompts for the value, so it never appears in your shell history:

   ```bash
   gh secret set SUPABASE_ACCESS_TOKEN -R alumni-network-ca/platform
   ```

3. Set the project refs (the 20 letters in the project's dashboard URL). These are not secret.

   ```bash
   gh variable set SUPABASE_STAGING_PROJECT_REF -R alumni-network-ca/platform --body <staging ref>
   gh variable set SUPABASE_PRODUCTION_PROJECT_REF -R alumni-network-ca/platform --body <production ref>
   ```

When a project moves (the new Supabase organization, BIZ-04), update its variable. Then run the workflow by hand once against the new database, so it receives every migration.

## Everyday use

- **A run failed:** open it in Actions. Fix the cause (a missing secret, a migration that fails on real data), then use Run workflow on `dev` with target `staging` to try again. Never edit a migration that a hosted database has already applied: add a new one.
- **Check a database by hand:** `supabase migration list --linked` after `supabase link --project-ref <ref>`.
- **Emergency fix applied by hand:** commit the same SQL as a new migration, then run `supabase migration repair --status applied <version> --linked`, so the history matches again.
