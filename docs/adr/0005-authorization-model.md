# 0005: Authorization model, roles and platform access

- **Status:** Proposed (DEC-04) · **Date:** 2026-10-14 · **Requirements:** MT3, F13, S1–S3, S7

## Decision

### Institution roles (`institution_memberships.role`)

| Permission | owner | admin | reviewer | alumni |
|---|:-:|:-:|:-:|:-:|
| View roster, records, approval queue | ✓ | ✓ | ✓ | — |
| Approve / reject / needs-info on claims | ✓ | ✓ | ✓ | — |
| Edit alumni records, suspend / reactivate | ✓ | ✓ | — | — |
| Invite alumni, resend / revoke invitations | ✓ | ✓ | — | — |
| CSV import | ✓ | ✓ | — | — |
| Export CSV / XLSX | ✓ | ✓ | — | — |
| View audit log, freshness reports | ✓ | ✓ | ✓ | — |
| Manage staff roles | ✓ | — | — | — |
| Institution settings (branding, sender, options) | ✓ | — | — | — |
| Use directory, edit own profile, initiate contact | ✓* | ✓* | ✓* | ✓ |

\* Staff can use the directory only if they also hold an alumni profile.

The `student` role exists in the enum but grants nothing until the student workflow is approved (ST1).

### Enforcement

1. **Postgres RLS** on every table. `has_permission(institution_id, permission)` reads the caller's active membership and the `role_permissions` mapping.
2. **Privileged writes go only through `security definer` RPCs.** The first statement of each is `perform assert_permission(...)`, and each one writes `audit_log`.
3. **Server actions and route handlers re-check** the session and permission before calling the RPCs (S3). The UI hides controls too, but that is never the control itself.
4. **Admins need TOTP MFA.** Admin RPCs require `aal2` in the JWT.

### Platform admins

- Listed in `platform_admins`. They manage institutions, but get **no** standing read access to alumni data.
- To support a school, a platform admin opens a time-boxed grant (`platform_access_grants`: institution, reason, expiry ≤ 8 h). The grant is audited, and RLS honours it only while it is active.

## Consequences

- One permission matrix, kept in the database and the docs, is tested by pgTAP for every role × tenant pair.
- A status change (suspension or revocation) takes effect on the next request, because RLS reads membership live. JWT role claims are not used for authorization.
