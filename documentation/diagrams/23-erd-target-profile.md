# Target profile domain

Target field inventory and relationships from PRODUCT_ANALYSIS §6. The Auth user entity represents external `auth.users`; NEW and CHANGED annotations show migration impact.

```mermaid
erDiagram
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
alumni_profiles {
  uuid id PK
  uuid institution_id FK
  uuid user_id FK
  profile_status status "CHANGED"
  text first_name
  text last_name
  text preferred_name "CHANGED"
  int grad_year
  text bio
  text current_city
  text current_country
  text work_city
  text work_country
  uuid career_field_id FK "CHANGED"
  text career_field_other "CHANGED"
  text job_title
  text current_employer
  text_array languages
  text linkedin_url
  text website_url
  text avatar_path "CHANGED"
  text contact_topics
  profile_visibility visibility "CHANGED"
  boolean contact_allowed
  boolean student_contact_allowed
  timestamptz claimed_at
  timestamptz onboarding_completed_at
  timestamptz last_confirmed_at
  timestamptz next_reconfirm_due_at "CHANGED"
  uuid import_batch_id FK "CHANGED"
  timestamptz created_at
  timestamptz updated_at
  timestamptz deleted_at "CHANGED"
}
alumni_private {
  uuid profile_id PK, FK "NEW"
  uuid institution_id FK
  text claim_email UK
  text contact_email
  text phone
  text maiden_name
  text school_student_id
  text admin_notes
  timestamptz created_at
  timestamptz updated_at
}
alumni_education {
  uuid id PK
  uuid profile_id FK
  uuid institution_id FK
  text school
  text degree
  text field_of_study
  int graduation_year
  int sort_order
  timestamptz created_at
}
alumni_experience {
  uuid id PK
  uuid profile_id FK
  uuid institution_id FK
  text job_title
  text employer
  uuid career_field_id FK "CHANGED"
  text location
  int start_year
  int end_year
  boolean is_current
  int sort_order
  timestamptz created_at
}
career_fields {
  uuid id PK "NEW"
  uuid institution_id FK
  text key
  text label_en
  text label_fr
  int sort_order
  boolean is_active
}
offer_types {
  uuid id PK "NEW"
  uuid institution_id FK
  text key
  text label_en
  text label_fr
  text audience
  int sort_order
  boolean is_active
}
profile_offers {
  uuid profile_id PK, FK "NEW"
  uuid offer_type_id PK, FK
  uuid institution_id FK
}
profile_tags {
  uuid profile_id PK, FK "NEW"
  uuid institution_id FK
  text tag PK
}
institutions ||--o{ alumni_profiles : alumni
alumni_profiles ||--|| alumni_private : private
alumni_profiles ||--o{ alumni_education : educated
alumni_profiles ||--o{ alumni_experience : worked
alumni_profiles ||--o{ profile_offers : offers
alumni_profiles ||--o{ profile_tags : tagged
career_fields ||--o{ alumni_profiles : categorizes
career_fields ||--o{ alumni_experience : categorizes
offer_types ||--o{ profile_offers : defines
```

### Enums and target RLS

`profile_status`: imported, invited, claimed, suspended, archived, deceased. `profile_visibility`: hidden, members, admins_only.

| Table | Access rule |
|---|---|
| `institutions` | Tenant members read; admins manage |
| `alumni_profiles` | Member reads claimed and visible; owner edits safe fields; admin manages |
| `alumni_private` | Owner and admins only |
| `alumni_education` | Read when parent visible; owner and admins write |
| `alumni_experience` | Read when parent visible; owner and admins write |
| `career_fields` | Member reads; admin manages options |
| `offer_types` | Member reads; admin manages options |
| `profile_offers` | Read when parent visible; owner and admins write |
| `profile_tags` | Read when parent visible; owner and admins write |

## Notes

- See [PRODUCT_ANALYSIS](../../docs/PRODUCT_ANALYSIS.md) for the source model.
