# 0004: Eligibility and claim policy

- **Status:** Proposed (DEC-01) · **Date:** 2026-10-14 · **Requirements:** F3, F4, S4, HL1

## Context

The PDF says email verification alone must not establish alumni identity (F4). Schools hold authoritative graduate records, including the email they have on file.

## Decision

Two paths:

1. **Invitation (auto-approved).**
   - An admin imports a record and sends an invitation to the email the school has on file.
   - The invitation token is single-use, stored hashed, and expires after 14 days.
   - The alumnus signs up or signs in **with the invited email** and verifies it.
   - Because the token proves control of the school-held address and the record proves eligibility, the claim is approved automatically and an active membership is created.
2. **Self-registration (review).**
   - Someone signs up from the school's landing page with any email.
   - They give their name, maiden name if any, graduation year and an optional note. This creates a pending `access_request`.
   - An admin (owner, admin or reviewer) links the request to an existing record, creates a new record, asks for more information, or rejects it with a reason.

Rules for both paths:

- Responses never reveal whether an email or record exists (S4).
- A conflicting claim, a duplicate record or a changed email goes to the review queue. Nothing is ever merged automatically.
- Pending, needs-info and rejected users get no private-directory access.

## Consequences

- The Alumni Office's main workload is the self-registration queue, which keeps it small when invitations go to good school data.
- Invitation tokens must survive email link scanners: the GET request only renders a page and the claim needs an authenticated POST.
