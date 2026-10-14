# Institution admin operations

The current admin dashboard supports counts, roster search, a four-column browser CSV import, and verification decisions. Planned actions add invitations, server validation, settings, and an audit viewer.

```mermaid
flowchart TD
subgraph Admin["A6 Admin"]
login["Sign in"] --> dashboard["/admin dashboard"]
end
subgraph UI[Admin UI]
membership["Membership maybeSingle ⚠ F20"]
stats["Total, claimed, unclaimed, requests"]
roster["Roster"] --> search["Search and claim filter"] --> view["Claimed records only ⚠ F19"]
requests["Verification requests"]
csv["Choose four-column CSV"] --> parse["PapaParse in browser"]
newstats["Invites, stale, activity ▢ 2.4"]
actions["Edit, suspend, archive ▢ 1.12"]
upload["Upload CSV ▢ 1.11"] --> validate["Validate on server ▢ 1.11"] --> preview["Preview row errors ▢ 1.11"]
ask["Invite these records? ▢ 1.1"]
invites["Track and resend invites ▢ 1.1"]
audit["Audit viewer ▢ 2.3"]
settings["Tenant settings ▢ 1.12"]
mfa["Require MFA ▢ 1.16"]
end
subgraph DB[Postgres]
insert["Direct batch insert"] --> duplicate["Duplicate fails batch ⚠ F18"]
commit["import_alumni ▢ 1.11"] --> batch["import_batches ▢ 1.11"]
end
login -.-> mfa
login --> membership --> dashboard
dashboard --> stats
dashboard --> roster
dashboard --> requests
dashboard --> csv
dashboard -.-> newstats
roster -.-> actions
csv --> insert
dashboard -.-> upload
preview --> commit --> ask --> invites
dashboard -.-> audit
dashboard -.-> settings
classDef built fill:#E8F5E9,stroke:#2E7D32,color:#1B5E20
classDef partial fill:#FFF8E1,stroke:#F9A825,color:#5D4037
classDef broken fill:#FFEBEE,stroke:#C62828,color:#B71C1C
classDef todo fill:#FAFAFA,stroke:#9E9E9E,stroke-dasharray:5 5,color:#616161
classDef actor fill:#0B2159,stroke:#0B2159,color:#FFFFFF
classDef system fill:#EDE7F6,stroke:#5E35B1,color:#311B92
class login built
class dashboard built
class stats built
class roster built
class search built
class requests built
class csv built
class parse built
class insert built
class membership partial
class view partial
class duplicate partial
class mfa todo
class newstats todo
class actions todo
class upload todo
class validate todo
class preview todo
class commit todo
class batch todo
class ask todo
class invites todo
class audit todo
class settings todo
```

## Notes

- **F18** — CSV import is minimal.
- **F19** — Admins can't act on records.
- **F20** — The admin page assumes one admin membership.
- **1.1** — Invitation system: `create_invitations(profile_ids)` stores token hashes; a server action with the secret key sends branded emails; `/claim?token=` landing page; expiry, resend and revoke; invite status in the roster.
- **1.11** — Admin import v2: server-side; more columns (maiden name, phone, school student ID); validation and preview; upsert and dedupe; per-row errors; `import_batches`.
- **1.12** — Admin roster actions: view and edit any record, suspend or reactivate, archive or delete, mark deceased, resend invite; fix the multi-membership query.
- **1.16** — Super-admin bootstrap script instead of hand-run SQL; MFA enforced for admins.
- **2.3** — Audit-log writes for every admin and security action, plus an admin viewer.
- **2.4** — Dashboard metrics: % claimed, invites pending or expired, stale profiles, recent activity (in the design).
