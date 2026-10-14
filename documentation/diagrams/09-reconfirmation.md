# Reconfirmation nudge lifecycle

This is a planned phase 2 flow. The current application updates `last_confirmed_at` only when an alumnus saves their profile.

```mermaid
sequenceDiagram
participant S as Scheduler
participant DB as Postgres
participant E as Email provider
participant A as Alumnus
participant N as Next.js app
S->>DB: Daily 09:00 find due claimed profiles
DB->>DB: Create reconfirmation_request with token hash
DB->>E: Send EN/FR Still accurate and Update links
E->>A: Deliver nudge
alt Still accurate
 A->>N: GET /confirm?token
 N->>DB: confirm_profile(token)
 DB->>DB: Update last_confirmed_at and next due date
 N-->>A: Thank-you page
else Update profile
 A->>N: /login then /me
 N->>DB: save_my_profile(payload)
 DB->>DB: Update confirmation and next due date
else No response
 S->>E: Reminder 2 after 14 days
 S->>E: Reminder 3 after 30 days
 S->>DB: Mark stale after reminder 3
 opt Institution enables auto-hide
 DB->>DB: Set visibility hidden
 E-->>A: Notify alumnus
 end
 DB-->>N: Include stale count on admin dashboard
end
Note over DB,N: Target ▢ 2.1, current save-only timestamp ⚠ F21
```

## Notes

- **F21** — The twice-yearly reconfirmation is not built.
- **2.1** — Reconfirmation nudges: a daily job finds profiles past `next_reconfirm_due_at` and emails a signed one-click "Still accurate" link plus an "Update" link. Reminders follow, and after N of them the profile is flagged stale or auto-hidden (configurable per school). (F21).
