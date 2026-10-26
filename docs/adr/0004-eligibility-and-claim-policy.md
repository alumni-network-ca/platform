# 0004: Eligibility: the school shares a sign-up link, an admin approves every sign-up

- **Status:** Accepted (DEC-01, DEC-05, 2026-10-26) · **Date:** 2026-10-14 · **Requirements:** F3, F4, S4, HL1

## Context

The PDF says email verification alone must not establish alumni identity (F4). The partners chose not to import school records at launch, so the platform holds no alumni data the school hasn't had each person submit themselves.

## Decision

1. **The school promotes the link.** Herzliah emails its alumni, from its own mailing list, a link to `herzliah.alumninetwork.ca/join`.
2. **Sign-up.** The person creates an account, verifies their email, and gives first and last name, maiden name if any, graduation year and an optional note. This creates a pending `access_request` with `source = 'signup'`, for the school taken from the host.
3. **Approval.** A school admin or reviewer approves the request (which creates the profile and activates the membership), asks for more information, or rejects it with a reason. Each decision is audited and sends an email.
4. **Possible duplicates** (same name and year, or same email already approved) are flagged to the admin. Nothing is ever merged automatically, and a name alone never links two people (DEC-05).

Rules:

- Responses never reveal whether an email or person exists (S4). The applicant never sees duplicate flags.
- Pending, needs-info and rejected users get no private-directory access, from pages or from the API.

## Future: CSV import

`access_requests.source` and the approval RPCs are written so a later CSV import (IMP-* in Future) creates requests or pre-filled records with `source = 'import'` that flow through the same queue. Per-person invitation links (ONB-01/02) come with it.

## Consequences

- The school's approval queue is the main workload. Herzliah needs enough admins and reviewers to keep approval time under 2 business days during the launch wave.
- No school data is loaded before people consent by signing up, which simplifies the legal basis (LEGAL-01).
