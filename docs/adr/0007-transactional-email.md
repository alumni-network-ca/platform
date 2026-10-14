# 0007: Transactional email: Resend, outbox, auth email hook, sender identity

- **Status:** Proposed (DEC-12) · **Date:** 2026-10-14 · **Requirements:** E1–E4, S6, S8

## Decision

### Provider and sender

- **Provider:** Resend. The free tier covers the build and the pilot (3,000/month, 100/day). The Pro plan ($20/month) applies when volume requires it.
- **Sending domain:** one verified domain, `mail.alumni-network.ca` (SPF, DKIM, DMARC).
- **Sender per institution:** `"<Institution> Alumni Network" <<slug>@mail.alumni-network.ca>`, with `Reply-To` set to the institution's alumni office address. New schools need no DNS changes.

### Outbox

- Every app email is a row in `email_outbox`, inserted in the same transaction as the business event. The row records: institution, template, locale, recipient, payload reference, status, attempts and provider id.
- **Sending.** A worker sends right away (Next.js `after()`), and a cron sweeper retries with backoff.
- **No duplicates.** The outbox id is Resend's idempotency key, so retries never send twice (E2).
- **Recipient checks.** Recipients on `email_suppressions` are skipped.

### Auth email

Supabase Auth's **Send Email Hook** calls our endpoint, so confirmation, reset and email-change emails use the same branded EN/FR templates, tenant sender and outbox tracking. Links use `token_hash` (cross-device safe, F9).

### Webhooks

Signed Resend webhooks for delivered, bounced and complained update the outbox and the suppressions. Admins see failures and can correct an address and resend (E4).

### Templates and logs

- Templates are React Email components with messages from the same next-intl files as the app.
- Logs keep ids and statuses only. Never email bodies or tokens.

### Environments

Local and CI send through **Mailpit** (bundled with the Supabase CLI). Staging can send only to an allow-list of addresses (S8).
