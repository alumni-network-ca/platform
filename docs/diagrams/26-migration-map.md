# Current to target migration map

Each arrow corresponds to the field map in PRODUCT_ANALYSIS §6.6. The checklist below orders the required migrations and identifies data backfills and rollback considerations.

```mermaid
flowchart LR
subgraph Current[Current]
claimemail["alumni_profiles.claim_email"]
visibility["visible plus privacy_preset"]
claimed["user_id plus claimed_at"]
profession["profession text"]
industry["industry"]
universities["universities array"]
degrees["degrees array"]
flags["availability_flags booleans"]
career["experience.career_field"]
membership["super_admin membership"]
reqid["access_requests.user_id required"]
end
subgraph Target[Target]
private["alumni_private.claim_email"]
targetvis["visibility enum"]
status["profile_status enum"]
careerfk["career_field_id lookup"]
dropped["removed"]
education["alumni_education rows"]
offers["profile_offers rows"]
exfk["experience.career_field_id"]
platform["platform_admins"]
requestv2["nullable user_id; tenant required"]
end
claimemail -->|move| private
visibility -->|merge| targetvis
claimed -->|derive| status
profession -->|lookup FK| careerfk
industry -->|drop| dropped
universities -->|split rows| education
degrees -->|split rows| education
flags -->|split rows| offers
career -->|lookup FK| exfk
membership -->|move| platform
reqid -->|alter| requestv2
classDef built fill:#E8F5E9,stroke:#2E7D32,color:#1B5E20
classDef partial fill:#FFF8E1,stroke:#F9A825,color:#5D4037
classDef broken fill:#FFEBEE,stroke:#C62828,color:#B71C1C
classDef todo fill:#FAFAFA,stroke:#9E9E9E,stroke-dasharray:5 5,color:#616161
classDef actor fill:#0B2159,stroke:#0B2159,color:#FFFFFF
classDef system fill:#EDE7F6,stroke:#5E35B1,color:#311B92
class claimemail partial
class visibility partial
class claimed partial
class profession partial
class industry partial
class universities partial
class degrees partial
class flags partial
class career partial
class membership partial
class reqid partial
class private todo
class targetvis todo
class status todo
class careerfk todo
class dropped todo
class education todo
class offers todo
class exfk todo
class platform todo
class requestv2 todo
```

### Migration checklist

1. [ ] `005_capture_live_schema` — pull production definitions; inspect live-only RPCs. Roll back by restoring captured definitions.
2. [ ] `006_security_hardening` — revoke unsafe function access, protect system fields, and fix parent-aware RLS (F2–F5). Roll back policies only after replacing equivalent protections.
3. [ ] `007_alumni_private_split` — copy claim and contact fields, validate counts, then remove public columns. Roll back from retained backup until cutover.
4. [ ] `008_visibility_and_status_enums` — derive values from current booleans and timestamps. Keep reversible mappings until all clients migrate.
5. [ ] `009_lookup_tables_and_profile_offers` — seed CAREER_FIELDS and backfill offer booleans. Retain original flags during verification.
6. [ ] `010_education_single_source` — backfill array schools and degrees into education rows. Deduplicate before removing arrays.
7. [ ] `011_invitations_and_requests_v2` — migrate tokens and statuses; require a tenant for requests. Keep old status mapping for rollback.
8. [ ] `012_engagement_tables` — create contact, reconfirmation, report, and message records. New empty tables can be removed before use.
9. [ ] `013_platform_admins` — copy super-admin memberships to separate identity rows. Keep old roles until authorization cutover.

## Notes

- **F2** — `approve_access_request` runs for anonymous callers.
- **F5** — Owners can rewrite system columns.
