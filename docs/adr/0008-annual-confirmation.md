# 0008: Rolling annual profile confirmation

- **Status:** Accepted (DEC-06, 2026-10-26) · **Date:** 2026-10-14 · **Requirements:** E5–E8

## Decision

### Schedule

- Each approved alumnus is due **12 months after the last time they updated their profile or clicked "still accurate"**. Either one restarts the clock.
- New users count as confirmed when they complete onboarding.
- A daily job creates `confirmation_requests` and queues emails. Reminders go at **+14 and +30 days**. After that the profile is reported as **overdue**. It is never hidden or deleted silently.
- Times are computed in UTC and sends happen at 14:00 UTC (10:00 Montreal).
- A failed delivery is retried by the outbox. Hard bounces are reported for admin follow-up.

### Scanner-safe confirmation

- The email link opens `/confirm/<token>`.
- **GET only renders** a summary of the profile and two buttons: "Yes, still accurate" and "Update my profile".
- **Only the POST from that button confirms.** Link scanners, previews and ordinary visits never confirm (E6).

### Provenance

- `profile_confirmations` records `source`: `alumnus_link`, `alumnus_app` or `admin_edit`.
- `alumni_profiles.last_confirmed_at` is updated only by alumnus sources: a "still accurate" click or the alumnus saving their own profile. `updated_at` is tracked separately.
- Delivery, opens and admin edits never count as confirmation (E5).

### Idempotency

- One open request per profile per cycle (unique constraint).
- The job records its runs in `job_runs`, and a missed run raises an alert.

## Wording

The reminder emails use the per-school database templates from ADR 0007, so each school edits and approves its own wording.

## Consequences

Sends are spread across the year, which keeps us inside the free email tier. An optional school-wide campaign can be added later.
