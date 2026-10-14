# System context and actor map

Current trust boundaries and planned external services. The browser uses the publishable key to call Supabase directly, so row policies and RPC permissions are security boundaries. A2 is an imported data subject with no outgoing interactions.

```mermaid
flowchart LR
subgraph People[Human actors]
a1["A1 Visitor"]
a2["A2 Unclaimed alumnus"]
a3["A3 Claimant"]
a4["A4 Unmatched applicant"]
a5["A5 Member"]
a6["A6 Institution admin"]
a7["A7 Super admin"]
a8["A8 Student ▢ 3.3"]
end
subgraph Browser[Browser - publishable key]
browser["Next.js client pages"]
end
subgraph Server[Vercel and Next.js server]
app["RSC pages and server actions"]
end
subgraph Supabase[Supabase]
auth["Auth"]
rls["PostgREST and RLS ⚠ F3 F4 F5"]
rpc["Security definer RPCs ⛔ F1 F2"]
pg["Postgres tables"]
end
subgraph Third[Third parties]
smtp["Default SMTP ⛔ F9"]
cron["Scheduler ▢ 2.1"]
captcha["Turnstile ▢ 1.2"]
end
subgraph Deploy[Deploy pipeline]
github["GitHub web uploads ⚠ F27"]
vercel["Vercel preview and production ⚠ F27"]
end
a1 -->|"/ and /claim"| browser
a3 -->|"/onboarding"| browser
a4 -->|"/request-access"| browser
a5 -->|"/directory and /me"| browser
a6 -->|"/admin"| browser
a7 -->|"SQL bootstrap"| pg
a8 -.->|"future access"| browser
browser -->|"publishable key"| rls
browser -->|"RPC calls"| rpc
browser --> app
app --> auth
app --> rls
rpc --> pg
rls --> pg
auth --> smtp
cron -.-> pg
captcha -.-> browser
github --> vercel
vercel --> app
classDef built fill:#E8F5E9,stroke:#2E7D32,color:#1B5E20
classDef partial fill:#FFF8E1,stroke:#F9A825,color:#5D4037
classDef broken fill:#FFEBEE,stroke:#C62828,color:#B71C1C
classDef todo fill:#FAFAFA,stroke:#9E9E9E,stroke-dasharray:5 5,color:#616161
classDef actor fill:#0B2159,stroke:#0B2159,color:#FFFFFF
classDef system fill:#EDE7F6,stroke:#5E35B1,color:#311B92
class a1 actor
class a2 actor
style a2 stroke-dasharray:5 5
class a3 actor
class a4 actor
class a5 actor
class a6 actor
class a7 actor
class a8 actor
class browser system
class app system
class auth system
class pg system
class rls partial
class rpc broken
class smtp broken
class cron todo
class captcha todo
class github partial
class vercel partial
```

## Notes

- **F1** — The repo no longer matches the live database.
- **F2** — `approve_access_request` runs for anonymous callers.
- **F3** — Members can read every column of every visible profile.
- **F4** — Child tables leak hidden and unclaimed profiles.
- **F5** — Owners can rewrite system columns.
- **F9** — Auth emails don't work for real alumni.
- **F27** — Engineering hygiene.
- **1.2** — Non-enumerating claim: `/claim` → `request_claim_link(email)` always shows the same message, emails a link if there is a match, and otherwise offers verification; Turnstile and rate limiting.
- **2.1** — Reconfirmation nudges: a daily job finds profiles past `next_reconfirm_due_at` and emails a signed one-click "Still accurate" link plus an "Update" link. Reminders follow, and after N of them the profile is flagged stale or auto-hidden (configurable per school). (F21).
- **3.3** — Student role: the school verifies students, who see only alumni with `student_contact_allowed`.
