# Decision register

This is the PDF §12 decision register. Each row is a decision with its owner, status and affected requirements. The discussion happens on the linked `DEC-*` GitHub issue. Once a decision is made, update the row, the ADR status and the issue.

Decisions marked **Accepted** were settled by the partners on 2026-10-26. Noah can reopen any of them on its issue.

| ID | Decision | Outcome | Status | Requirements | ADR |
|---|---|---|---|---|---|
| DEC-01 | Alumni eligibility and claim policy | The school emails alumni the sign-up link. A school admin or reviewer approves **every** sign-up (name, maiden name, graduation year). No CSV import and no per-person invitations at launch; access requests carry a `source` so a CSV import can feed the same queue later. | Accepted | F3, F4, HL1 | [0004](adr/0004-eligibility-and-claim-policy.md) |
| DEC-02 | Profile field list, required fields, visibility | Proposal approved, except contact channels are **optional**. A published profile with no channel shows "No contact details shared". | Accepted | F1, F2, F7, S5 | [0006](adr/0006-contact-channels.md) |
| DEC-03 | Contact methods and email exposure | Alumni choose their channels. Email and phone are revealed one profile per click and logged. **No daily limit.** | Accepted | F10, F11 | [0006](adr/0006-contact-channels.md) |
| DEC-04 | Admin role and permission matrix | System admin (Gab, Noah), school admin, reviewer, alumni. No owner role. | Accepted | F13, MT5 | [0005](adr/0005-authorization-model.md) |
| DEC-05 | CSV matching and duplicate policy | Moot at launch. Admins link people by hand during approval; a name alone never merges two people. | Accepted | F15 | [0004](adr/0004-eligibility-and-claim-policy.md) |
| DEC-06 | Annual confirmation schedule and wording | Due 12 months after the last profile update or "still accurate" click; reminders at +14 and +30 days. Email templates live in the database per school, EN/FR, and school admins edit and approve them. | Accepted | E5–E7 | [0008](adr/0008-annual-confirmation.md) |
| DEC-07 | Language fallback and bilingual wording | EN \| FR toggle on every page. User's choice → browser → school default (Herzliah: EN). | Accepted | F9, HL1 | [0009](adr/0009-frontend-stack.md) |
| DEC-08 | Retention and deletion rules | Self-deleted accounts purged within 30 days, rejected sign-ups deleted after 90 days, logs kept 2 years. Counsel confirms (LEGAL-01). | Accepted, pending counsel | S5, S7 | — |
| DEC-09 | RPO/RTO, support hours, severity levels | Daily backups (RPO 24 h), RTO 8 h, business-hours support, critical issues answered the same day. | Accepted | §9 | — |
| DEC-10 | Release-blocking criteria | A cross-school leak, a high or critical security finding, a broken sign-up/approval/login flow, or missing FR text. | Accepted | §6, HL9 | — |
| DEC-11 | Pilot cohort and success measures | Open: Noah picks the graduating years and the success measures with Herzliah. | Proposed | HL8 | — |
| DEC-12 | Email sender identity | `"Herzliah Alumni Network" <noreply@alumninetwork.ca>`, Reply-To the school's alumni office. | Accepted | E1 | [0007](adr/0007-transactional-email.md) |
| DEC-13 | Multi-school membership model | Every school is independent: separate sign-up, approval, profile and session per school. | Accepted | MT5 | [0002](adr/0002-accounts-and-memberships.md) |
| DEC-14 | Tenancy by subdomain | `herzliah.alumninetwork.ca`; the bare `alumninetwork.ca` hosts the page for schools and the system-admin console. | Accepted | MT1, MT3 | [0001](adr/0001-tenancy-by-subdomain.md) |

## Technical decisions (accepted by the technical lead)

| Decision | ADR |
|---|---|
| Clean v2 schema baseline | [0003](adr/0003-schema-v2-clean-baseline.md) |
| Frontend stack | [0009](adr/0009-frontend-stack.md) |
| Testing strategy | [0010](adr/0010-testing-strategy.md) |
| Observability | [0012](adr/0012-observability.md) |
| Git workflow | [0013](adr/0013-git-workflow.md) |
