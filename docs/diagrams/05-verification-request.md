# Verification request lifecycle

The first diagram shows the current request form and admin actions, including the unversioned live RPCs. The second shows a target lifecycle that links or creates a record, sends a decision email, and issues an invitation.

```mermaid
flowchart TD
subgraph Applicant["A4 Applicant"]
c1["No roster match"] --> c2["/request-access form"]
end
subgraph App[Next.js app]
c3["Submit request ⚠ F16"] --> c4["Request received"]
c5["Admin verification table"]
c6["Approve"]
c7["Reject"]
c8["No decision email ⚠ F16"]
end
subgraph DB[Postgres]
c9["request_alumni_access live-only ⛔ F1"]
c10["approve_access_request live-only ⛔ F2"]
c11["Reject updates status directly"]
end
c2 --> c3 --> c9 --> c4
c5 --> c6 --> c10 --> c8
c5 --> c7 --> c11 --> c8
class c1 partial

classDef built fill:#E8F5E9,stroke:#2E7D32,color:#1B5E20
classDef partial fill:#FFF8E1,stroke:#F9A825,color:#5D4037
classDef broken fill:#FFEBEE,stroke:#C62828,color:#B71C1C
classDef todo fill:#FAFAFA,stroke:#9E9E9E,stroke-dasharray:5 5,color:#616161
classDef actor fill:#0B2159,stroke:#0B2159,color:#FFFFFF
classDef system fill:#EDE7F6,stroke:#5E35B1,color:#311B92
class c1 partial
class c2 partial
class c3 partial
class c4 partial
class c5 partial
class c6 partial
class c7 partial
class c8 partial
class c9 broken
class c10 broken
class c11 partial
```

### Target flow

```mermaid
flowchart TD
subgraph Applicant["A4 Applicant"]
t1["Submit form and CAPTCHA ▢ 1.4"]
t9["Reply with more details ▢ 1.4"]
end
subgraph App[Next.js app]
t2["Show request received ▢ 1.4"]
end
subgraph Admin["A6 Admin"]
t4["Review and search roster ▢ 1.4"]
decision{"Admin decision?"}
end
subgraph DB[Postgres]
t3["Store tenant and pending status ▢ 1.4"]
t5["Link existing record ▢ 1.4"]
t6["Create new record ▢ 1.4"]
t7["Set needs_info ▢ 1.4"]
t8["Reject with reason ▢ 1.4"]
t12["Write audit_log ▢ 1.4"]
end
subgraph Email[Email provider]
t10["Notify Alumni Office ▢ 1.4"]
t11["Send decision or invitation ▢ 1.4"]
t13["Join invitation claim flow ▢ 1.1"]
end
t1 --> t3 --> t2
t3 --> t10 --> t4 --> decision
decision -->|link| t5 --> t12
decision -->|create| t6 --> t12
decision -->|needs info| t7 --> t11 --> t9 --> t4
decision -->|reject| t8 --> t12
t12 --> t11 --> t13
classDef built fill:#E8F5E9,stroke:#2E7D32,color:#1B5E20
classDef partial fill:#FFF8E1,stroke:#F9A825,color:#5D4037
classDef broken fill:#FFEBEE,stroke:#C62828,color:#B71C1C
classDef todo fill:#FAFAFA,stroke:#9E9E9E,stroke-dasharray:5 5,color:#616161
classDef actor fill:#0B2159,stroke:#0B2159,color:#FFFFFF
classDef system fill:#EDE7F6,stroke:#5E35B1,color:#311B92
class t1,t2,t3,t4,t5,t6,t7,t8,t9,t10,t11,t12,t13 todo
class decision system
```

### Current limitations

- `approve_access_request` is live-only and callable by `anon` before its request lookup; the rest of its authorization and outcome are unverified (F2, F16).
- Signed-in unmatched users have no path to this form (F15). An `institution_id` of NULL would hide requests from institution admins (F16).

## Notes

- **F1** — The repo no longer matches the live database.
- **F2** — `approve_access_request` runs for anonymous callers.
- **F15** — Signed-in unmatched users hit a dead end.
- **F16** — Access-request approval is undefined.
- **1.1** — Invitation system: `create_invitations(profile_ids)` stores token hashes; a server action with the secret key sends branded emails; `/claim?token=` landing page; expiry, resend and revoke; invite status in the roster.
- **1.4** — Access-request lifecycle: on approve, the admin links an existing record or creates one, and an invitation goes out automatically. On reject, an email with the reason. An "ask for more info" state. Store `institution_id`. A CTA from the onboarding no-match screen.
