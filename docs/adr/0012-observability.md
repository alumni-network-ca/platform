# 0012: Observability and alerting

- **Status:** Accepted · **Date:** 2026-10-14 · **Requirements:** S7, S9, E4, D3

## Decision

| What | How |
|---|---|
| Errors | **Sentry** (browser and server, free tier), environment-tagged |
| Personal data in Sentry | Scrubbed: no emails, tokens or request bodies |
| Logs | One JSON object per line, with `request_id`, `institution_id`, `actor` (user id) and `action`. Never emails, tokens or message bodies. |
| Uptime | An external monitor pings `/api/health` (checks the DB and the most recent job heartbeat) every 5 minutes |
| Scheduled jobs | Every run writes `job_runs` (start, end, counts, error) |
| Jobs that didn't run | The health check fails when a daily job hasn't succeeded in 26 h |
| Alerts | Sentry and the uptime monitor email both partners. Email failure rate above 5% in 24 h raises an alert. |
| Audit log | The `audit_log` table is append-only and separate from operational logs. It's visible to institution admins (own tenant) and platform admins. |
