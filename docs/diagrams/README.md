# Diagrams

Open [the interactive viewer](index.html) for rendered diagrams and the permissions matrix. The Markdown files contain editable Mermaid source. Current behavior is verified against the checked-in code and migrations; live-only database objects are identified from [PRODUCT_ANALYSIS](../../docs/PRODUCT_ANALYSIS.md), not a fresh production schema pull.

## User flows

- [System context and actor map](01-system-context.md)
- [Sitemap, guards, and navigation states](02-sitemap-and-guards.md)
- [First-time claim: current flow](03-first-time-claim-current.md)
- [First-time claim: invitation target](04-first-time-claim-target.md)
- [Verification request lifecycle](05-verification-request.md)
- [Member search and contact](06-member-search-and-contact.md)
- [Profile management and privacy](07-profile-and-privacy.md)
- [Institution admin operations](08-admin-operations.md)
- [Reconfirmation nudge lifecycle](09-reconfirmation.md)
- [Alumni record lifecycle](10-record-lifecycle.md)
- [Platform admin and new-school onboarding](11-platform-admin.md)
- [Auth and claim technical sequence](12-auth-sequence.md)

## Data model

> The target ERDs (21–26) predate the 2026-10-26 decisions and are superseded by [docs/architecture/data-model.md](../../docs/architecture/data-model.md).

- [Current schema ERD](20-erd-current.md)
- [Target schema overview](21-erd-target-overview.md)
- [Target identity and tenancy](22-erd-target-identity.md)
- [Target profile domain](23-erd-target-profile.md)
- [Target onboarding and requests](24-erd-target-onboarding.md)
- [Target engagement and safety](25-erd-target-engagement.md)
- [Current to target migration map](26-migration-map.md)

