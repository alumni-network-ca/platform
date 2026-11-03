# 0017: Configuration: env vars and shared settings in config/

- **Status:** Accepted · **Date:** 2026-11-03 · **Related:** FND-16

## Context

Environment variables were read with `process.env.X!` in six app files, each repeating its own default
(`ROOT_DOMAIN ?? "localhost"` twice). Cookie names, their lifetimes and the signup resend cooldown were written out in
several files, and two auth limits repeated `supabase/config.toml` with nothing checking they matched.

## Decision

| What | Where |
|---|---|
| Browser-safe env vars (`NEXT_PUBLIC_*`) | `config/env/public.ts`, read as literal `process.env.NEXT_PUBLIC_*` so Next inlines them |
| Server env vars that are not secret (`ROOT_DOMAIN`, `VERCEL_ENV`, `PREVIEW_DEFAULT_SCHOOL`) | `config/env/server.ts`, importable by `proxy.ts` |
| Secrets (`SUPABASE_SECRET_KEY`, later Resend, Turnstile, cron) | `config/env/secrets.ts`, guarded by `server-only` |
| A value copied in two or more files, a mirror of `supabase/config.toml`, or a cookie/header name crossing the proxy, server and browser | `config/*.ts` by topic: `tenancy`, `auth`, `language`, `ui` |
| Domain vocabulary (profile sections, career fields, page sizes) | Stays next to the `lib/` code that uses it |

- Env values are getters, read on use: a missing variable fails the request that needs it with
  `"X is not set. See .env.example."`, not the build or unrelated pages.
- Validation is a small `required()` helper. When Zod lands (ADR 0009) it can replace it without changing callers.
- Lint (`no-restricted-properties`) rejects `process.env` outside `config/env/`. `scripts/`, `e2e/` and the tool
  config files keep their own reads: they run outside Next.
- `config/auth.test.ts` fails when `MIN_PASSWORD_LENGTH` or `CODE_LENGTH` drift from `supabase/config.toml`.

## Consequences

- A new env var means a getter in the right tier and a line in `.env.example`, nothing else.
- Moving a secret to the wrong tier is caught: importing `secrets.ts` from client code fails the build.
- `config/env/server.ts` has no `server-only` marker because the proxy imports it; its values are not secret.
