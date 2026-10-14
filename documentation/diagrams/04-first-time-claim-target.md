# First-time claim: invitation target

The target claim path begins with an admin-issued invitation and uses a token linked to an imported record. Password confirmation can complete on another device, and profile visibility starts hidden until the alumnus explicitly opts in.

```mermaid
flowchart TD
subgraph Admin["A6 Admin"]
admin["Open roster"] --> importcsv["Import CSV ▢ 1.11"] --> select["Select records"]
end
subgraph App[Next.js app]
open["Open claim link"] --> peek["peek_invitation"] --> tokenvalid{"Token valid?"}
renew["Request fresh link"]
setpwd["Locked email; set password"]
onboard["Start onboarding"] --> wizard["Complete profile wizard"] --> consent["Accept policy and terms ▢ 1.13"] --> visibility["Explicit visibility choice ▢ 1.6"]
askmail["Enter email on /claim"] --> requestlink["request_claim_link ▢ 1.2"] --> uniform["Show uniform response"]
end
subgraph DB[Postgres RPC]
invite["create_invitations ▢ 1.1"] --> stored["Store hashed token"]
redeem["claim_with_invitation ▢ 1.3"]
save["save_my_profile ▢ 1.5"]
matched{"Email match?"}
end
subgraph Auth[Supabase Auth]
signup["signUp with Turnstile ▢ 1.2"] --> confirm["verifyOtp token hash ▢ 0.5"]
end
subgraph Email[Email provider]
mail["Send branded EN/FR invitation"]
nomatch["Send verification instructions"]
end
select --> invite
stored --> mail --> open
tokenvalid -->|expired or revoked| renew --> requestlink
tokenvalid -->|valid| setpwd --> signup
confirm --> onboard --> redeem --> wizard
visibility --> save --> done["/me visibility banner"]
askmail --> matched
matched -->|yes| mail
matched -->|no| nomatch
classDef built fill:#E8F5E9,stroke:#2E7D32,color:#1B5E20
classDef partial fill:#FFF8E1,stroke:#F9A825,color:#5D4037
classDef broken fill:#FFEBEE,stroke:#C62828,color:#B71C1C
classDef todo fill:#FAFAFA,stroke:#9E9E9E,stroke-dasharray:5 5,color:#616161
classDef actor fill:#0B2159,stroke:#0B2159,color:#FFFFFF
classDef system fill:#EDE7F6,stroke:#5E35B1,color:#311B92
class admin todo
class importcsv todo
class select todo
class invite todo
class stored todo
class mail todo
class open todo
class peek todo
class renew todo
class setpwd todo
class signup todo
class confirm todo
class onboard todo
class redeem todo
class wizard todo
class consent todo
class visibility todo
class save todo
class done todo
class askmail todo
class requestlink todo
class uniform todo
class nomatch todo
class tokenvalid system
class matched system
```

## Notes

- **0.5** — `/auth/confirm` (`verifyOtp` with `token_hash`) and an `/auth/error` page; keep `/auth/callback` for OAuth only.
- **1.1** — Invitation system: `create_invitations(profile_ids)` stores token hashes; a server action with the secret key sends branded emails; `/claim?token=` landing page; expiry, resend and revoke; invite status in the roster.
- **1.2** — Non-enumerating claim: `/claim` → `request_claim_link(email)` always shows the same message, emails a link if there is a match, and otherwise offers verification; Turnstile and rate limiting.
- **1.3** — `claim_with_invitation(token)`: the tenant comes from the token. Keep tenant-aware email-match as a fallback.
- **1.5** — `save_my_profile(payload jsonb)`, one transaction, used by both onboarding and `/me`.
- **1.6** — Visibility model: one `visibility` enum (`hidden` / `members` / `admins_only`), default `hidden`, an explicit opt-in step, consent recorded.
- **1.11** — Admin import v2: server-side; more columns (maiden name, phone, school student ID); validation and preview; upsert and dedupe; per-row errors; `import_batches`.
- **1.13** — Legal pages and consent capture; self-service account deletion and data export (Law 25 portability).
