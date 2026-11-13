# Profile management and privacy

The current profile editor has separate writes for the profile, flags, education, and experience. The target replaces these with a single transaction and adds explicit visibility and data rights.

```mermaid
flowchart TD
subgraph Member["A5 Member"]
me["Open /me"]
end
subgraph App[Next.js app]
profile["Herzliah and contact"] --> career["Career and work history"] --> education["Education"] --> networking["Networking preferences"] --> sidebar["Visibility and contact"] --> save["Save profile"]
missing["Fields missing on /me ⚠ F22"]
privacy["Two visibility fields ⚠ F13"]
export["Export data ▢ 1.13"]
delete["Delete account ▢ 1.13"]
prefs["Notification choices ▢ 2.7"]
end
subgraph DB[Postgres]
writes["Six client writes ⚠ F14"] --> confirmed["Set last_confirmed_at"]
rpcsave["Atomic save_my_profile ▢ 1.5"]
visibility["Visibility enum ▢ 1.6"]
end
me --> profile
profile --> missing
sidebar --> privacy
save --> writes
save -.-> rpcsave --> visibility
me -.-> export
me -.-> delete
me -.-> prefs
classDef built fill:#E8F5E9,stroke:#2E7D32,color:#1B5E20
classDef partial fill:#FFF8E1,stroke:#F9A825,color:#5D4037
classDef broken fill:#FFEBEE,stroke:#C62828,color:#B71C1C
classDef todo fill:#FAFAFA,stroke:#9E9E9E,stroke-dasharray:5 5,color:#616161
classDef actor fill:#0B2159,stroke:#0B2159,color:#FFFFFF
classDef system fill:#EDE7F6,stroke:#5E35B1,color:#311B92
class me built
class profile built
class career built
class education built
class networking built
class sidebar built
class save built
class confirmed built
class writes partial
class missing partial
class privacy partial
class rpcsave todo
class visibility todo
class export todo
class delete todo
class prefs todo
```

### Target visibility states

```mermaid
stateDiagram-v2
[*] --> Hidden: claim hidden by default
Hidden --> Members: owner opts in via /me
Members --> Hidden: owner hides via /me
Hidden --> AdminsOnly: owner or admin changes scope
AdminsOnly --> Members: owner or admin changes scope
Members --> AdminsOnly: owner or admin changes scope
AdminsOnly --> Hidden: owner hides via /me
Members --> Hidden: system auto-hides overdue profile
```

## Notes

- **F13** — Visibility defaults to on, against the spec.
- **F14** — Profile saves are not atomic.
- **F22** — Onboarding and profile fields don't line up.
- **1.5** — `save_my_profile(payload jsonb)`, one transaction, used by both onboarding and `/me`.
- **1.6** — Visibility model: one `visibility` enum (`hidden` / `members` / `admins_only`), default `hidden`, an explicit opt-in step, consent recorded.
- **1.13** — Legal pages and consent capture; self-service account deletion and data export (Law 25 portability).
- **2.7** — Notification preferences and one-click unsubscribe (CASL).
