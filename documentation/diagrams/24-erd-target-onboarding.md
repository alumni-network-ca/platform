# Target onboarding and requests

Target field inventory and relationships from PRODUCT_ANALYSIS §6. The Auth user entity represents external `auth.users`; NEW and CHANGED annotations show migration impact.

```mermaid
erDiagram
institutions {
  uuid id PK
}
alumni_profiles {
  uuid id PK
}
invitations {
  uuid id PK
  uuid institution_id FK
  uuid alumni_profile_id FK
  text token_hash UK
  timestamptz expires_at
  timestamptz sent_at
  timestamptz claimed_at
  timestamptz created_at
  text email "CHANGED"
  invitation_status status "CHANGED"
  uuid created_by FK "CHANGED"
  int send_count "CHANGED"
  timestamptz last_sent_at "CHANGED"
  timestamptz revoked_at "CHANGED"
  text last_error "CHANGED"
  text provider_message_id "CHANGED"
}
access_requests {
  uuid id PK
  uuid institution_id FK
  uuid user_id FK
  text email
  text first_name
  text last_name
  text maiden_name "CHANGED"
  int grad_year
  text note
  request_status status
  uuid matched_profile_id FK "CHANGED"
  text review_note "CHANGED"
  uuid reviewed_by FK
  timestamptz reviewed_at
  timestamptz decision_email_sent_at "CHANGED"
  timestamptz created_at
}
import_batches {
  uuid id PK "NEW"
  uuid institution_id FK
  uuid uploaded_by FK
  text filename
  int row_count
  int inserted_count
  int updated_count
  int skipped_count
  jsonb errors
  timestamptz created_at
}
institutions ||--o{ invitations : sends
institutions ||--o{ access_requests : reviews
institutions ||--o{ import_batches : imports
alumni_profiles ||--o{ invitations : invited
alumni_profiles |o--o{ access_requests : matches
import_batches |o--o{ alumni_profiles : imports
```

### Enums and target RLS

`invitation_status`: pending, sent, bounced, claimed, expired, revoked. `request_status`: pending, needs_info, approved, rejected.

| Table | Access rule |
|---|---|
| `institutions` | Tenant members read; admins manage |
| `alumni_profiles` | Member reads claimed and visible; owner edits safe fields; admin manages |
| `invitations` | Anonymous peek via RPC; admin manages |
| `access_requests` | Anonymous submits via RPC; owner and admins read |
| `import_batches` | Admins only |

## Notes

- See [PRODUCT_ANALYSIS](../../docs/PRODUCT_ANALYSIS.md) for the source model.
