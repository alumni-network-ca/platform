# Member search and contact

Members sign in, filter visible profiles, and can reveal a contact email through an unversioned RPC. The target relay sends a message without exposing the recipient address.

```mermaid
flowchart TD
subgraph Member["A5 Member"]
sign["Enter email and password"]
cta["Contact alumnus"]
end
subgraph App[Next.js app]
ok{"Signed in?"}
next["router.push(next) ⛔ F7"]
directory["Load visible profiles"]
filters["Client text, career, location, year"]
university["University filter ⚠ F12"]
prof["View profile"]
isown{"Own profile?"}
manage["Manage my profile"]
contact{"Contact allowed?"}
no["No contact card"]
reset["Reset email dead end ⛔ F10"]
resetpage["Set new password ▢ 1.7"]
extras["Language and tags ▢ 2.5"]
serversearch["Server search ▢ 3.4"]
relay["Relay message ▢ 2.2"]
report["Report or block ▢ 2.8"]
end
subgraph DB[Postgres]
reveal["reveal_contact_email ⚠ F1"]
rest["REST exposes claim_email ⛔ F3"]
event["contact_events ▢ 1.10"]
end
subgraph Email[Email]
mail["Open mailto link"]
end
sign --> ok
ok -->|yes| next --> directory --> filters --> prof
ok -->|forgot password| reset -.-> resetpage
filters --> university
filters -.-> extras
filters -.-> serversearch
prof --> isown
isown -->|yes| manage
isown -->|no| contact
contact -->|no| no
contact -->|yes| cta --> reveal --> mail
directory --> rest
cta -.-> relay --> event --> report
classDef built fill:#E8F5E9,stroke:#2E7D32,color:#1B5E20
classDef partial fill:#FFF8E1,stroke:#F9A825,color:#5D4037
classDef broken fill:#FFEBEE,stroke:#C62828,color:#B71C1C
classDef todo fill:#FAFAFA,stroke:#9E9E9E,stroke-dasharray:5 5,color:#616161
classDef actor fill:#0B2159,stroke:#0B2159,color:#FFFFFF
classDef system fill:#EDE7F6,stroke:#5E35B1,color:#311B92
class sign built
class directory built
class filters built
class prof built
class manage built
class no built
class cta built
class mail built
class next broken
class reset broken
class university partial
class reveal partial
class rest broken
class resetpage todo
class extras todo
class serversearch todo
class relay todo
class event todo
class report todo
class ok system
class isown system
class contact system
```

## Notes

- **F1** — The repo no longer matches the live database.
- **F3** — Members can read every column of every visible profile.
- **F7** — Open redirect.
- **F10** — Password reset is a dead end.
- **F12** — The University filter ignores real alumni.
- **1.7** — `/auth/reset-password` page (`updateUser`) and the recovery redirect.
- **1.10** — Contact v1 hardened: `reveal_contact_email` checks `contact_allowed` and membership, logs to `contact_events`, and enforces a daily limit.
- **2.2** — "Message via the Network" relay (in the design): a form on the profile; the platform sends the email with `Reply-To` set to the sender, so the recipient's address is never exposed. Rate limits, report and block.
- **2.5** — Expertise tags (in the design); languages and graduating-decade filters.
- **2.8** — Report a profile or message; admin moderation queue.
- **3.4** — Server-side search and pagination (Postgres FTS or `pg_trgm`) beyond about 5k profiles.
