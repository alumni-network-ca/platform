# Target identity and tenancy

Target field inventory and relationships from PRODUCT_ANALYSIS §6. The Auth user entity represents external `auth.users`; NEW and CHANGED annotations show migration impact.

```mermaid
erDiagram
auth_users {
  uuid id PK
}
institutions {
  uuid id PK
  text name
  text slug UK
  text logo_url
  text primary_color
  text accent_color
  timestamptz created_at
  text custom_domain UK "CHANGED"
  text default_locale "CHANGED"
  int reconfirm_interval_months "CHANGED"
  boolean is_active "CHANGED"
  jsonb settings "CHANGED"
}
platform_admins {
  uuid user_id PK, FK "NEW"
  timestamptz created_at
  uuid created_by FK
}
institution_memberships {
  uuid id PK
  uuid institution_id FK
  uuid user_id FK
  member_role role
  member_status status
  timestamptz created_at
  timestamptz suspended_at "CHANGED"
  uuid suspended_by FK "CHANGED"
  text suspension_reason "CHANGED"
  timestamptz last_seen_at "CHANGED"
}
consents {
  uuid id PK "NEW"
  uuid user_id FK
  uuid institution_id FK
  text document
  text version
  timestamptz accepted_at
  text ip_hash
  text user_agent
}
auth_users ||--o| platform_admins : operates
auth_users ||--o{ institution_memberships : joins
auth_users ||--o{ consents : accepts
institutions ||--o{ institution_memberships : members
institutions ||--o{ consents : records
```

### Enums and target RLS

`member_role`: institution_admin, alumni, student. `member_status`: active, suspended, revoked.

| Table | Access rule |
|---|---|
| `institutions` | Tenant members read; admins manage |
| `platform_admins` | Platform admins only |
| `institution_memberships` | Self and tenant admins |
| `consents` | Owner writes/reads; admins read |

## Notes

- See [PRODUCT_ANALYSIS](../../docs/PRODUCT_ANALYSIS.md) for the source model.
