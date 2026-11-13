# Target engagement and safety

Target field inventory and relationships from PRODUCT_ANALYSIS §6. The Auth user entity represents external `auth.users`; NEW and CHANGED annotations show migration impact.

```mermaid
erDiagram
institutions {
  uuid id PK
}
auth_users {
  uuid id PK
}
alumni_profiles {
  uuid id PK
}
contact_events {
  uuid id PK "NEW"
  uuid institution_id FK
  uuid sender_user_id FK
  uuid sender_profile_id FK
  uuid recipient_profile_id FK
  contact_channel channel
  timestamptz created_at
}
messages {
  uuid id PK "NEW"
  uuid institution_id FK
  uuid sender_profile_id FK
  uuid recipient_profile_id FK
  text subject
  text body
  timestamptz sent_at
  text delivery_status
  text provider_message_id
  timestamptz reported_at
}
reconfirmation_requests {
  uuid id PK "NEW"
  uuid institution_id FK
  uuid profile_id FK
  text token_hash UK
  int reminder_number
  timestamptz sent_at
  timestamptz expires_at
  timestamptz confirmed_at
  text provider_message_id
}
reports {
  uuid id PK "NEW"
  uuid institution_id FK
  uuid reporter_user_id FK
  uuid target_profile_id FK
  uuid message_id FK
  text reason
  text status
  uuid reviewed_by FK
  timestamptz reviewed_at
  timestamptz created_at
}
audit_log {
  bigint id PK
  uuid institution_id FK
  uuid actor_user_id FK
  text action
  text target_type
  text target_id
  jsonb metadata
  timestamptz created_at
}
student_profiles {
  uuid id PK "NEW"
  uuid institution_id FK
  uuid user_id FK
  text first_name
  text last_name
  int expected_grad_year
  uuid verified_by FK
  timestamptz verified_at
  text status
}
institutions ||--o{ contact_events : logs
institutions ||--o{ messages : relays
institutions ||--o{ reconfirmation_requests : nudges
institutions ||--o{ reports : moderates
institutions ||--o{ audit_log : audits
institutions ||--o{ student_profiles : verifies
auth_users ||--o{ student_profiles : belongs
auth_users ||--o{ audit_log : acts
alumni_profiles ||--o{ contact_events : contacts
alumni_profiles ||--o{ messages : messages
alumni_profiles ||--o{ reconfirmation_requests : confirms
alumni_profiles ||--o{ reports : reported
messages |o--o{ reports : reported
```

### Enums and target RLS

`contact_channel`: email_reveal, relay_message.

| Table | Access rule |
|---|---|
| `institutions` | Tenant members read; admins manage |
| `alumni_profiles` | Member reads claimed and visible; owner edits safe fields; admin manages |
| `contact_events` | Insert via RPC; sender and admins read |
| `messages` | Send via RPC; parties and admins read |
| `reconfirmation_requests` | Confirm via token RPC; admins manage |
| `reports` | Member submits; admins review |
| `audit_log` | Admins read |
| `student_profiles` | Student owner and admins |

## Notes

- See [PRODUCT_ANALYSIS](../../docs/PRODUCT_ANALYSIS.md) for the source model.
