# Current schema ERD

Derived from migrations 001, 003, and 004, plus the live-only fields recorded in PRODUCT_ANALYSIS. The live database has not been independently inspected in this run. `auth_users` represents external `auth.users`.

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
}
institution_memberships {
  uuid id PK
  uuid institution_id FK
  uuid user_id FK
  member_role role
  member_status status
  timestamptz created_at
}
alumni_profiles {
  uuid id PK
  uuid institution_id FK
  uuid user_id FK
  text claim_email
  text first_name
  text last_name
  int grad_year
  text bio
  text current_city
  text current_country
  text current_employer
  text job_title
  text profession
  text industry
  text_array universities
  text_array degrees
  text_array languages
  text linkedin_url
  text website_url
  text privacy_preset
  boolean contact_allowed
  boolean is_directory_visible
  timestamptz claimed_at
  timestamptz last_confirmed_at
  timestamptz onboarding_completed_at
  timestamptz created_at
  timestamptz updated_at
  text work_city "live-only not migrated"
  text work_country "live-only not migrated"
  text contact_topics "live-only not migrated"
  boolean student_contact_allowed "live-only not migrated"
}
availability_flags {
  uuid profile_id PK, FK
  uuid institution_id FK
  boolean mentoring
  boolean career_advice
  boolean job_opportunities
  boolean offering_jobs
  boolean offering_internships
  boolean shadowing
  boolean speaking
  boolean networking
  boolean entrepreneurship
  boolean student_questions "live-only not migrated"
}
alumni_experience {
  uuid id PK
  uuid profile_id FK
  uuid institution_id FK
  text job_title
  text employer
  text career_field
  text location
  int start_year
  int end_year
  boolean is_current
  int sort_order
  timestamptz created_at
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
invitations {
  uuid id PK
  uuid institution_id FK
  uuid alumni_profile_id FK
  text token_hash UK
  timestamptz expires_at
  timestamptz sent_at
  timestamptz claimed_at
  timestamptz created_at
}
access_requests {
  uuid id PK
  uuid institution_id FK
  uuid user_id FK
  text email
  text first_name
  text last_name
  int grad_year
  text note
  text status
  timestamptz created_at
  timestamptz reviewed_at
  uuid reviewed_by FK
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
institutions ||--o{ institution_memberships : has
institutions ||--o{ alumni_profiles : has
institutions ||--o{ availability_flags : has
institutions ||--o{ alumni_experience : has
institutions ||--o{ alumni_education : has
institutions ||--o{ invitations : has
institutions ||--o{ access_requests : has
institutions ||--o{ audit_log : has
auth_users ||--o{ institution_memberships : joins
auth_users |o--o| alumni_profiles : claims
auth_users ||--o{ access_requests : submits
auth_users ||--o{ audit_log : acts
alumni_profiles ||--o| availability_flags : has
alumni_profiles ||--o{ alumni_experience : has
alumni_profiles ||--o{ alumni_education : has
alumni_profiles ||--o{ invitations : has
```

### RLS policies today

| Table | Policy | Operation | Rule | Issue |
|---|---|---|---|---|
| institutions | institutions_read_member | SELECT | tenant member or super admin |  |
| institution_memberships | memberships_read_self_or_admin | SELECT | self or tenant admin |  |
| alumni_profiles | profiles_read_same_tenant | SELECT | owner, admin or claimed visible member | F3 every column |
| alumni_profiles | profiles_insert_admin | INSERT | tenant admin |  |
| alumni_profiles | profiles_update_owner_admin | UPDATE | owner or admin | F5 system fields |
| alumni_profiles | profiles_delete_admin | DELETE | tenant admin |  |
| availability_flags | availability_read_same_tenant | SELECT | any tenant member | F4 hidden parent |
| availability_flags | availability_write_owner_admin | ALL | owner or admin |  |
| alumni_experience | experience_read_same_tenant | SELECT | any tenant member | F4 hidden parent |
| alumni_experience | experience_owner_admin_write | ALL | owner or admin |  |
| alumni_education | education_read_same_tenant | SELECT | any tenant member | F4 hidden parent |
| alumni_education | education_owner_admin_write | ALL | owner or admin |  |
| invitations | invitations_admin_only | ALL | tenant admin |  |
| access_requests | access_request_insert_self | INSERT | authenticated self | F1 live RPC unreviewed |
| access_requests | access_request_read_self_or_admin | SELECT | self or tenant admin | F16 NULL tenant hidden |
| access_requests | access_request_admin_update | UPDATE | tenant admin | F16 NULL tenant hidden |
| audit_log | audit_admin_read | SELECT | tenant admin |  |

### SECURITY DEFINER functions

| Function | Caller or grant | Issue |
|---|---|---|
| `is_member_of`, `is_admin_of`, `is_super_admin` | No explicit revoke in migrations | Default execute grant needs review (F2) |
| `find_claimable_profile` | Explicit anon, authenticated | F6, F23 |
| `claim_my_profile` | Explicit authenticated; default PUBLIC grant not revoked | F8, F23 |
| `request_alumni_access` | Live-only; definition unknown | F1 |
| `approve_access_request` | Live-only; anon observed reaching lookup | F1, F2 |
| `reveal_contact_email` | Live-only; definition unknown | F1, F3 |

## Notes

- **F1** — The repo no longer matches the live database.
- **F2** — `approve_access_request` runs for anonymous callers.
- **F3** — Members can read every column of every visible profile.
- **F4** — Child tables leak hidden and unclaimed profiles.
- **F5** — Owners can rewrite system columns.
- **F6** — Email enumeration on `/claim`.
- **F8** — The claim depends entirely on email confirmation.
- **F16** — Access-request approval is undefined.
- **F23** — The tenant is hard-coded.
