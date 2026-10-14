# First-time claim: current flow

The as-built flow starts with an anonymous email lookup and ends with several client writes. Confirmation delivery and cross-device callbacks are deployment risks documented in the product analysis; the callback also accepts an unvalidated next parameter.

```mermaid
flowchart TD
subgraph Alumnus["A1/A3 Alumnus"]
landing["Landing page"] --> clickclaim["Claim your profile"]
password["Create password"]
email["Open confirmation email ⛔ F9"]
end
subgraph App[Next.js app]
lookup["find_claimable_profile ⛔ F6"]
found{"Record found?"}
request["Request verification ⚠ F15"]
wizard["Onboarding: match record"]
nomatch["No match dead end ⛔ F15"]
step2["Herzliah details"] --> step3["Education"] --> step4["Career required"] --> step5["Network and privacy ⚠ F13"]
defaults["Visibility pre-ticked ⚠ F13"]
writes["Six client writes ⚠ F14"]
done["/me"]
end
subgraph Auth[Supabase Auth]
signup["signUp with callback URL"]
session{"Immediate session?"}
callback["exchangeCodeForSession ⛔ F9"]
same{"Same browser?"}
redirect["Unvalidated next ⛔ F7"]
end
subgraph DB[Postgres RPC]
claim["claim_my_profile ⚠ F23"]
matched{"Matched?"}
save["Profile and child tables"]
end
landing --> lookup
lookup --> found
found -->|no| request
found -->|yes| password
password --> signup
signup --> session
session -->|yes: confirmation off, F8| wizard
session -->|no| email
email --> callback
callback --> same
same -->|no| noemail["Login required ⛔ F9"]
same -->|yes| redirect
redirect --> wizard
wizard --> claim
claim --> matched
matched -->|no| nomatch
matched -->|yes| step2
step5 --> defaults --> writes --> save --> done
classDef built fill:#E8F5E9,stroke:#2E7D32,color:#1B5E20
classDef partial fill:#FFF8E1,stroke:#F9A825,color:#5D4037
classDef broken fill:#FFEBEE,stroke:#C62828,color:#B71C1C
classDef todo fill:#FAFAFA,stroke:#9E9E9E,stroke-dasharray:5 5,color:#616161
classDef actor fill:#0B2159,stroke:#0B2159,color:#FFFFFF
classDef system fill:#EDE7F6,stroke:#5E35B1,color:#311B92
class landing built
class clickclaim built
class password built
class signup built
class wizard built
class claim built
class step2 built
class step3 built
class step4 built
class step5 built
class save built
class done built
class lookup broken
class callback broken
class noemail broken
class redirect broken
class nomatch broken
class defaults broken
class writes broken
class found system
class session system
class same system
class matched system
class email broken
class request partial
```

## Notes

- **F6** — Email enumeration on `/claim`.
- **F7** — Open redirect.
- **F8** — The claim depends entirely on email confirmation.
- **F9** — Auth emails don't work for real alumni.
- **F13** — Visibility defaults to on, against the spec.
- **F14** — Profile saves are not atomic.
- **F15** — Signed-in unmatched users hit a dead end.
- **F23** — The tenant is hard-coded.
