# 0005: Authorization model, roles and system-admin access

- **Status:** Accepted (DEC-04, 2026-10-26) · **Date:** 2026-10-14 · **Requirements:** MT3, F13, S1–S3, S7

## Decision

### School roles (`institution_memberships.role`)

| Permission | school_admin | reviewer | alumni |
|---|:-:|:-:|:-:|
| View roster, records, approval queue | ✓ | ✓ | — |
| Approve / reject / needs-info on sign-ups | ✓ | ✓ | — |
| View audit log, freshness reports | ✓ | ✓ | — |
| Edit alumni records, suspend / reactivate / archive | ✓ | — | — |
| Export CSV / XLSX | ✓ | — | — |
| Edit and approve email templates | ✓ | — | — |
| Manage staff (invite, change role, remove) | ✓ | — | — |
| School settings (branding, reply-to, options) | ✓ | — | — |
| Use directory, edit own profile, initiate contact | ✓* | ✓* | ✓ |

\* Staff can use the directory only if they also hold an approved alumni profile.

- A school can have several school admins. The last school admin can't demote or remove themselves.
- The `student` role exists in the enum but grants nothing until the student workflow is approved (ST1).

### Enforcement

1. **Postgres RLS** on every table. `has_permission(institution_id, permission)` reads the caller's active membership and the `role_permissions` mapping.
2. **Privileged writes go only through `security definer` RPCs.** The first statement of each is `perform assert_permission(...)`, and each one writes `audit_log`.
3. **Server actions and route handlers re-check** the session and permission before calling the RPCs (S3). The UI hides controls too, but that is never the control itself.
4. **Staff need TOTP MFA.** Staff RPCs require `aal2` in the JWT.

### System admins (Gab and Noah)

- Listed in `platform_admins`. They create and configure schools and appoint each school's first school admin, but get **no** standing read access to alumni data.
- To support a school, a system admin opens a time-boxed grant (`platform_access_grants`: institution, reason, expiry ≤ 8 h). The grant is audited and visible to the school's admins, and RLS honours it only while it is active.

## Consequences

- One permission matrix, kept in the database and the docs, is tested by pgTAP for every role × tenant pair.
- A status change (suspension or revocation) takes effect on the next request, because RLS reads membership live. JWT role claims are not used for authorization.
