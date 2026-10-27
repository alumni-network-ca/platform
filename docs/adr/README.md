# Architecture Decision Records

Each ADR records one decision: its context, the decision itself and its consequences. Statuses:

- **Accepted**: technical decision within the technical lead's authority.
- **Proposed**: affects product, privacy or cost. Needs Noah's approval through the linked `DEC-*` issue, then becomes Accepted.
- **Superseded**: replaced by a later ADR.

| # | Title | Status | Decision issue |
|---|---|---|---|
| [0001](0001-tenancy-by-subdomain.md) | Tenancy resolved by subdomain | Accepted | DEC-14 |
| [0002](0002-accounts-and-memberships.md) | Every school is independent: per-school memberships, profiles and sessions | Accepted | DEC-13 |
| [0003](0003-schema-v2-clean-baseline.md) | Clean v2 schema baseline and migration conventions | Accepted | — |
| [0004](0004-eligibility-and-claim-policy.md) | Eligibility: sign-up link, admin approves every sign-up | Accepted | DEC-01 |
| [0005](0005-authorization-model.md) | Authorization model, roles and system-admin access | Accepted | DEC-04 |
| [0006](0006-contact-channels.md) | Contact channels and "Contacts Initiated" | Accepted | DEC-03 |
| [0007](0007-transactional-email.md) | Transactional email: Resend, outbox, auth email hook, sender identity | Accepted | DEC-12 |
| [0008](0008-annual-confirmation.md) | Rolling annual profile confirmation | Accepted | DEC-06 |
| [0009](0009-frontend-stack.md) | Frontend stack: Tailwind + shadcn/ui, next-intl, Zod | Accepted | — |
| [0010](0010-testing-strategy.md) | Testing strategy | Accepted | — |
| [0011](0011-environments-and-hosting.md) | Environments, hosting and cost | Proposed | BIZ-05 |
| [0012](0012-observability.md) | Observability and alerting | Accepted | — |
| [0013](0013-git-workflow.md) | Git workflow and releases | Accepted | — |
