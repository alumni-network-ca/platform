# Decision register

This is the PDF §12 decision register. Each row is a decision with its owner, status and affected requirements. The discussion happens on the linked `DEC-*` GitHub issue. Once a decision is approved, update the row and the ADR status.

| ID | Decision | Recommendation (from 2026-10-14 planning) | Owner | Status | Needed by | Requirements | ADR |
|---|---|---|---|---|---|---|---|
| DEC-01 | Alumni eligibility and claim policy | Invite to school-held email = auto-approve; self-signup = admin review | Noah | Proposed | M1 | F3, F4, HL1 | [0004](adr/0004-eligibility-and-claim-policy.md) |
| DEC-02 | Profile field list, required fields, visibility | See issue DEC-02 | Noah | Proposed | M1 | F1, F2, F7, S5 | — |
| DEC-03 | Contact methods and email exposure | Alumni choose channels (at least 1); email/phone revealed per click, logged, 20/day | Noah | Proposed | M1 | F10, F11 | [0006](adr/0006-contact-channels.md) |
| DEC-04 | Admin role and permission matrix | owner / admin / reviewer | Noah | Proposed | M1 | F13, MT5 | [0005](adr/0005-authorization-model.md) |
| DEC-05 | CSV matching and duplicate policy | Match on school id, then email; name + year only flagged for review | Noah | Proposed | M2 | F15 | — |
| DEC-06 | Annual confirmation schedule and wording | Rolling 12 months, reminders at +14/+30, never auto-hide | Noah | Proposed | M2 | E5–E7 | [0008](adr/0008-annual-confirmation.md) |
| DEC-07 | Language fallback and bilingual wording | Preference → cookie → browser → school default → EN | Noah | Proposed | M2 | F9, HL1 | [0009](adr/0009-frontend-stack.md) |
| DEC-08 | Retention and deletion rules | See issue DEC-08 | Noah | Proposed | M3 | S5, S7 | — |
| DEC-09 | RPO/RTO, support hours, severity levels | RPO 24 h, RTO 8 h; business hours ET; S1–S4 | Noah | Proposed | M3 | §9 | — |
| DEC-10 | Release-blocking severity criteria | No open critical/high findings without a recorded exception | Noah | Proposed | M3 | §6, HL9 | — |
| DEC-11 | Pilot cohort and success measures | See issue DEC-11 | Noah | Proposed | M3 | HL8 | — |
| DEC-12 | Email sender identity | `"Herzliah Alumni Network" <herzliah@mail.alumni-network.ca>` + school Reply-To | Noah | Proposed | M2 | E1 | [0007](adr/0007-transactional-email.md) |
| DEC-13 | Multi-institution membership model | One account; per-school membership and profile; separate sessions | Noah | Proposed | M1 | MT5 | [0002](adr/0002-accounts-and-memberships.md) |
| DEC-14 | Tenancy by subdomain | `<school>.alumni-network.ca` | Noah | Proposed | M1 | MT1, MT3 | [0001](adr/0001-tenancy-by-subdomain.md) |

## Technical decisions (accepted by the technical lead)

| Decision | ADR |
|---|---|
| Clean v2 schema baseline | [0003](adr/0003-schema-v2-clean-baseline.md) |
| Frontend stack | [0009](adr/0009-frontend-stack.md) |
| Testing strategy | [0010](adr/0010-testing-strategy.md) |
| Observability | [0012](adr/0012-observability.md) |
| Git workflow | [0013](adr/0013-git-workflow.md) |
