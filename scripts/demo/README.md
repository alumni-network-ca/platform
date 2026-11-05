# Running the Maïmonide demo

Everything runs on this laptop: the local Supabase stack (Docker) and the app from this worktree. The data is fictional.

## Before the meeting (5 minutes)

1. Start **Docker Desktop** and wait until it says it is running.
2. In the repository, start the local database if it is not already up:

   ```bash
   supabase start
   ```

3. In this worktree, start the app (its `.env.local` points at the local stack):

   ```bash
   npm run dev
   ```

4. Run the preflight check. Every line should be green:

   ```bash
   npm run demo -- --check
   ```

   If the Maïmonide data is missing (after a `supabase db reset`), load it with `--setup`.

## During the meeting

- **You drive, the script follows (recommended):** it opens a full-screen Chrome and plays the whole story. Press **→** in the browser to move to the next scene.

  ```bash
  npm run demo -- --manual
  ```

- **Hands-free:** the same, at its own pace (about 3 minutes).

  ```bash
  npm run demo
  ```

- **In English:** add `--lang en`.
- **If anything fails:** the script says which scene stopped and leaves the browser open, so you can carry on by hand. Record a backup video beforehand with `npm run demo -- --record --headless`; it lands in `scripts/demo/videos/` (git-ignored; open it in Chrome or Edge).

## What the demo shows

1. A new graduate creates an account, and the confirmation email is opened from Mailpit.
2. They request access (name, maiden name, class year, note).
3. They wait, and the directory stays locked.
4. A reviewer opens the dashboard and the queue, then approves the request.
5. The graduate builds a profile (about, education, career, how they want to help, contact) and publishes it.
6. They search the directory for a cardiologist who mentors, open Élie Azoulay's profile and reveal the email.
7. The school admin sees the new member, their history and the approval in the audit log.

Each run uses a new applicant, so you can rehearse as often as you like.

## Accounts, if you demo by hand

Local stack only, password `LocalDev-Passw0rd` (from `supabase/seed.sql`), at http://maimonide.localhost:3000/login, then "Sign in with a password":
`admin@maimonide.test`, `reviewer@maimonide.test`, `alumni@maimonide.test` (Yaël Ohayon), `pending@maimonide.test`.

In a browser that has never chosen a language, click **EN** then **FR** once: some forms otherwise start in English.
