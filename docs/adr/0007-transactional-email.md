# 0007: Transactional email: Resend, outbox, auth email hook, sender identity

- **Status:** Accepted (DEC-12, DEC-06, 2026-10-26) · **Date:** 2026-10-14 · **Requirements:** E1–E4, S6, S8

## Decision

### Provider and sender

- **Provider:** Resend. The free tier covers the build and the pilot (3,000/month, 100/day). The Pro plan ($20/month) applies when volume requires it.
- **Sending domain:** `alumninetwork.ca`, verified in Resend (SPF, DKIM, DMARC).
- **Sender:** `"<School> Alumni Network" <noreply@alumninetwork.ca>`. Only the display name changes per school, so new schools need no DNS changes.
- **Reply-To:** the school's alumni office address (`institutions.reply_to`), so replies reach a person.

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

- **The text lives in the database** (`email_templates`: school, template, locale, subject, body, status draft/approved). Each school starts from platform defaults in EN and FR.
- School admins edit the text only, with a fixed set of placeholders (`{first_name}`, `{school_name}`, `{confirm_link}`…), then preview and approve it. HTML and unknown placeholders are rejected. A template that is not approved is never sent.
- A branded React Email layout wraps the text and adds a plain-text part.
- Logs keep ids and statuses only. Never email bodies or tokens.

### Environments

Local and CI send through **Mailpit** (bundled with the Supabase CLI). Staging can send only to an allow-list of addresses (S8).
