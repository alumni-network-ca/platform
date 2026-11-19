# Sitemap, guards, and navigation states

Routes and redirects reflect the current App Router pages. Planned destinations are shown separately; they do not exist in the repository.

```mermaid
flowchart TD
subgraph Routes[Built routes]
home["/ public"] --> login["/login next ⛔ F7"]
home --> claim["/claim signed-in redirects"]
claim --> request["/request-access public"]
claim --> onboarding["/onboarding authenticated"]
callback["/auth/callback ⛔ F7 F9"] --> onboarding
login --> directory["/directory authenticated"]
onboarding --> me["/me profile required"]
directory --> profile["/profile/[id] authenticated; hidden 404"]
me --> admin["/admin role checked"]
end
subgraph Nav[Nav states - AuthActions]
navout["Signed out: Sign in; Claim"] --> navnew["No profile: Complete profile"]
navnew --> navmember["Profile: My profile"]
navmember --> navadmin["Admin role: Admin"]
end
subgraph Planned[Planned routes]
confirm["/auth/confirm ▢ 0.5"]
autherror["/auth/error ▢ 0.5"]
reset["/auth/reset-password ▢ 1.7"]
tokenclaim["/claim?token ▢ 1.1"]
reconfirm["/confirm?token ▢ 2.1"]
legal["/legal/privacy and terms ▢ 1.13"]
privacy["/me/privacy ▢ 1.13"]
invites["/admin/invitations ▢ 1.1"]
imports["/admin/imports ▢ 1.11"]
audit["/admin/audit ▢ 2.3"]
settings["/admin/settings ▢ 1.12"]
platform["/platform ▢ 3.2"]
end
admin -.-> invites
admin -.-> imports
admin -.-> audit
admin -.-> settings
classDef built fill:#E8F5E9,stroke:#2E7D32,color:#1B5E20
classDef partial fill:#FFF8E1,stroke:#F9A825,color:#5D4037
classDef broken fill:#FFEBEE,stroke:#C62828,color:#B71C1C
classDef todo fill:#FAFAFA,stroke:#9E9E9E,stroke-dasharray:5 5,color:#616161
classDef actor fill:#0B2159,stroke:#0B2159,color:#FFFFFF
classDef system fill:#EDE7F6,stroke:#5E35B1,color:#311B92
class home built
class claim built
class request built
class onboarding built
class me built
class directory built
class profile built
class admin built
class navout built
class navnew built
class navmember built
class navadmin built
class login broken
class callback broken
class confirm todo
class autherror todo
class reset todo
class tokenclaim todo
class reconfirm todo
class legal todo
class privacy todo
class invites todo
class imports todo
class audit todo
class settings todo
class platform todo
```

## Notes

- **F7** — Open redirect.
- **F9** — Auth emails don't work for real alumni.
- **0.5** — `/auth/confirm` (`verifyOtp` with `token_hash`) and an `/auth/error` page; keep `/auth/callback` for OAuth only.
- **1.1** — Invitation system: `create_invitations(profile_ids)` stores token hashes; a server action with the secret key sends branded emails; `/claim?token=` landing page; expiry, resend and revoke; invite status in the roster.
- **1.7** — `/auth/reset-password` page (`updateUser`) and the recovery redirect.
- **1.11** — Admin import v2: server-side; more columns (maiden name, phone, school student ID); validation and preview; upsert and dedupe; per-row errors; `import_batches`.
- **1.12** — Admin roster actions: view and edit any record, suspend or reactivate, archive or delete, mark deceased, resend invite; fix the multi-membership query.
- **1.13** — Legal pages and consent capture; self-service account deletion and data export (Law 25 portability).
- **2.1** — Reconfirmation nudges: a daily job finds profiles past `next_reconfirm_due_at` and emails a signed one-click "Still accurate" link plus an "Update" link. Reminders follow, and after N of them the profile is flagged stale or auto-hidden (configurable per school). (F21).
- **2.3** — Audit-log writes for every admin and security action, plus an admin viewer.
- **3.2** — Platform-admin console: create an institution, invite its admins, usage.
