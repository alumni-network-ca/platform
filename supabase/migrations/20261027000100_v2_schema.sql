-- v2 baseline, part 1 of 3: types, tables, indexes, triggers and reference data.
-- Design: docs/architecture/data-model.md (AUDIT-09). Replaces the legacy migrations in supabase/legacy/ (ADR 0003).
-- Part 2 (access) enables RLS and grants; part 3 (rpcs) holds every write path.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- Types ------------------------------------------------------------------------------------------------

create type public.member_role as enum ('school_admin', 'reviewer', 'alumni', 'student');
create type public.member_status as enum ('active', 'suspended', 'revoked');
create type public.request_status as enum ('pending', 'needs_info', 'approved', 'rejected', 'withdrawn');
create type public.request_source as enum ('signup', 'import');
create type public.profile_status as enum ('active', 'suspended', 'archived', 'deceased', 'deleted');
create type public.profile_visibility as enum ('hidden', 'members');
create type public.channel_type as enum ('email', 'phone', 'linkedin', 'facebook', 'instagram', 'website');
create type public.locale as enum ('en', 'fr');
create type public.email_template_key as enum (
  'access_approved', 'access_needs_info', 'access_rejected', 'welcome', 'staff_invitation',
  'annual_confirmation', 'confirmation_reminder_1', 'confirmation_reminder_2'
);
create type public.template_status as enum ('draft', 'approved');
create type public.email_status as enum (
  'queued', 'sending', 'sent', 'delivered', 'bounced', 'complained', 'failed', 'suppressed', 'skipped_no_template'
);
create type public.confirmation_source as enum ('onboarding', 'alumnus_save', 'alumnus_still_accurate');
create type public.consent_document as enum ('terms', 'privacy_policy', 'directory_publication');

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Tenancy and identity ---------------------------------------------------------------------------------

create table public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  status text not null default 'active' check (status in ('active', 'suspended')),
  default_locale public.locale not null default 'en',
  reply_to_email text check (reply_to_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  email_display_name text,
  branding jsonb not null default '{}'::jsonb,
  confirmation_interval_months int not null default 12 check (confirmation_interval_months between 1 and 36),
  custom_domain text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.platform_access_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.platform_admins (user_id) on delete cascade,
  institution_id uuid not null references public.institutions (id) on delete cascade,
  reason text not null check (length(trim(reason)) >= 5),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at and expires_at <= created_at + interval '8 hours')
);
create index platform_access_grants_active_idx on public.platform_access_grants (user_id, institution_id, expires_at);

create table public.institution_memberships (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null,
  status public.member_status not null default 'active',
  status_reason text,
  status_changed_by uuid references auth.users (id) on delete set null,
  status_changed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, user_id)
);
create index institution_memberships_user_idx on public.institution_memberships (user_id);

create table public.role_permissions (
  role public.member_role not null,
  permission text not null check (permission ~ '^[a-z]+\.[a-z]+$'),
  primary key (role, permission)
);

create table public.staff_invitations (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role public.member_role not null check (role in ('school_admin', 'reviewer')),
  token_hash text unique,
  expires_at timestamptz not null default now() + interval '7 days',
  invited_by uuid references auth.users (id) on delete set null,
  accepted_by uuid references auth.users (id) on delete set null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index staff_invitations_one_open_idx on public.staff_invitations (institution_id, lower(email))
  where accepted_at is null and revoked_at is null;

create table public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  locale public.locale not null default 'en',
  updated_at timestamptz not null default now()
);

-- Reference data (bilingual, per school or platform-wide) ----------------------------------------------

create table public.career_fields (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references public.institutions (id) on delete cascade,
  key text not null check (key ~ '^[a-z0-9_]+$'),
  label_en text not null,
  label_fr text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  unique nulls not distinct (institution_id, key)
);

create table public.offer_types (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references public.institutions (id) on delete cascade,
  key text not null check (key ~ '^[a-z0-9_]+$'),
  label_en text not null,
  label_fr text not null,
  audience text not null default 'alumni' check (audience in ('alumni', 'students', 'both')),
  sort_order int not null default 0,
  is_active boolean not null default true,
  unique nulls not distinct (institution_id, key)
);

-- Sign-up and approval ---------------------------------------------------------------------------------

create table public.access_requests (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  source public.request_source not null default 'signup',
  email text not null,
  first_name text not null check (length(trim(first_name)) between 1 and 80),
  last_name text not null check (length(trim(last_name)) between 1 and 80),
  maiden_name text check (length(maiden_name) <= 80),
  grad_year int not null check (grad_year between 1900 and 2100),
  note text check (length(note) <= 1000),
  status public.request_status not null default 'pending',
  info_request text check (length(info_request) <= 1000),
  applicant_reply text check (length(applicant_reply) <= 1000),
  decision_reason text check (length(decision_reason) <= 1000),
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  profile_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index access_requests_one_open_idx on public.access_requests (institution_id, user_id)
  where status in ('pending', 'needs_info');
create index access_requests_queue_idx on public.access_requests (institution_id, status, created_at);

-- Profiles ---------------------------------------------------------------------------------------------

create table public.alumni_profiles (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  status public.profile_status not null default 'active',
  visibility public.profile_visibility not null default 'hidden',
  first_name text not null check (length(trim(first_name)) between 1 and 80),
  last_name text not null check (length(trim(last_name)) between 1 and 80),
  preferred_name text check (length(preferred_name) <= 80),
  grad_year int not null check (grad_year between 1900 and 2100),
  city text check (length(city) <= 80),
  country text check (length(country) <= 80),
  bio text check (length(bio) <= 1000),
  job_title text check (length(job_title) <= 120),
  employer text check (length(employer) <= 120),
  career_field_id uuid references public.career_fields (id) on delete set null,
  career_field_other text check (length(career_field_other) <= 80),
  languages text[] not null default '{}',
  onboarding_step int not null default 0 check (onboarding_step between 0 and 10),
  onboarding_completed_at timestamptz,
  published_at timestamptz,
  last_confirmed_at timestamptz,
  confirmation_due_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, user_id),
  unique (id, institution_id)
);
create index alumni_profiles_directory_idx on public.alumni_profiles (institution_id, status, visibility);
create index alumni_profiles_class_idx on public.alumni_profiles (institution_id, grad_year);
create index alumni_profiles_career_idx on public.alumni_profiles (institution_id, career_field_id);
create index alumni_profiles_due_idx on public.alumni_profiles (confirmation_due_at) where status = 'active';
create index alumni_profiles_name_trgm_idx on public.alumni_profiles using gin (
  lower(first_name || ' ' || last_name || ' ' || coalesce(preferred_name, '')) extensions.gin_trgm_ops
);

alter table public.access_requests
  add constraint access_requests_profile_fk foreign key (profile_id) references public.alumni_profiles (id) on delete set null;

create table public.alumni_private (
  profile_id uuid primary key,
  institution_id uuid not null,
  maiden_name text check (length(maiden_name) <= 80),
  admin_notes text check (length(admin_notes) <= 2000),
  school_student_id text check (length(school_student_id) <= 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (profile_id, institution_id) references public.alumni_profiles (id, institution_id) on delete cascade
);

create table public.profile_contact_channels (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null,
  institution_id uuid not null,
  type public.channel_type not null,
  value text not null check (length(value) <= 300),
  is_public boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (profile_id, type),
  foreign key (profile_id, institution_id) references public.alumni_profiles (id, institution_id) on delete cascade,
  check (case type
    when 'email' then value ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    when 'phone' then value ~ '^\+[1-9][0-9]{6,14}$'
    else value ~ '^https://[^\s]+$'
  end)
);

create table public.alumni_education (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null,
  institution_id uuid not null,
  school text not null check (length(trim(school)) between 1 and 120),
  degree text check (length(degree) <= 120),
  field_of_study text check (length(field_of_study) <= 120),
  graduation_year int check (graduation_year between 1900 and 2100),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  foreign key (profile_id, institution_id) references public.alumni_profiles (id, institution_id) on delete cascade
);
create index alumni_education_profile_idx on public.alumni_education (profile_id, sort_order);
create index alumni_education_school_idx on public.alumni_education (institution_id, lower(school));

create table public.alumni_experience (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null,
  institution_id uuid not null,
  job_title text not null check (length(trim(job_title)) between 1 and 120),
  employer text check (length(employer) <= 120),
  career_field_id uuid references public.career_fields (id) on delete set null,
  location text check (length(location) <= 120),
  start_year int check (start_year between 1900 and 2100),
  end_year int check (end_year between 1900 and 2100),
  is_current boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  foreign key (profile_id, institution_id) references public.alumni_profiles (id, institution_id) on delete cascade,
  check (end_year is null or start_year is null or end_year >= start_year),
  check (not (is_current and end_year is not null))
);
create index alumni_experience_profile_idx on public.alumni_experience (profile_id, sort_order);

create table public.profile_offers (
  profile_id uuid not null,
  offer_type_id uuid not null references public.offer_types (id) on delete cascade,
  institution_id uuid not null,
  primary key (profile_id, offer_type_id),
  foreign key (profile_id, institution_id) references public.alumni_profiles (id, institution_id) on delete cascade
);
create index profile_offers_offer_idx on public.profile_offers (offer_type_id);

-- Contact and freshness --------------------------------------------------------------------------------

create table public.contact_events (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  initiator_user_id uuid references auth.users (id) on delete set null,
  recipient_profile_id uuid not null references public.alumni_profiles (id) on delete cascade,
  channel public.channel_type not null,
  created_at timestamptz not null default now()
);
create index contact_events_school_idx on public.contact_events (institution_id, created_at);
create index contact_events_dedupe_idx on public.contact_events (initiator_user_id, recipient_profile_id, channel, created_at);

create table public.confirmation_requests (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null,
  profile_id uuid not null,
  due_at timestamptz not null,
  token_hash text unique,
  status text not null default 'open' check (status in ('open', 'confirmed', 'superseded')),
  reminders_sent int not null default 0 check (reminders_sent between 0 and 2),
  last_sent_at timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (profile_id, institution_id) references public.alumni_profiles (id, institution_id) on delete cascade
);
create unique index confirmation_requests_one_open_idx on public.confirmation_requests (profile_id) where status = 'open';

create table public.profile_confirmations (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null,
  profile_id uuid not null,
  source public.confirmation_source not null,
  actor_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (profile_id, institution_id) references public.alumni_profiles (id, institution_id) on delete cascade
);
create index profile_confirmations_profile_idx on public.profile_confirmations (profile_id, created_at);

-- Email ------------------------------------------------------------------------------------------------

create table public.email_templates (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references public.institutions (id) on delete cascade,
  key public.email_template_key not null,
  locale public.locale not null,
  status public.template_status not null,
  subject text not null check (length(trim(subject)) between 1 and 200),
  body text not null check (length(body) between 1 and 5000 and position('<' in body) = 0 and position('<' in subject) = 0),
  edited_by uuid references auth.users (id) on delete set null,
  approved_by uuid references auth.users (id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (institution_id, key, locale, status)
);

create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references public.institutions (id) on delete cascade,
  template_key text not null,
  locale public.locale not null,
  to_email text not null,
  to_user_id uuid references auth.users (id) on delete set null,
  subject_id uuid,
  status public.email_status not null default 'queued',
  attempts int not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  provider_message_id text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index email_outbox_queue_idx on public.email_outbox (status, next_attempt_at);
create index email_outbox_school_idx on public.email_outbox (institution_id, created_at);

create table public.email_events (
  id uuid primary key default gen_random_uuid(),
  outbox_id uuid references public.email_outbox (id) on delete cascade,
  provider_message_id text,
  type text not null,
  occurred_at timestamptz not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index email_events_outbox_idx on public.email_events (outbox_id);

create table public.email_suppressions (
  email text primary key check (email = lower(email)),
  reason text not null check (reason in ('bounce', 'complaint', 'manual')),
  source_event_id uuid references public.email_events (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Governance and operations ----------------------------------------------------------------------------

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  document public.consent_document not null,
  version text not null check (length(version) between 1 and 40),
  accepted_at timestamptz not null default now(),
  withdrawn_at timestamptz
);
create index consents_user_idx on public.consents (institution_id, user_id, document);

create table public.audit_log (
  id bigint generated always as identity primary key,
  institution_id uuid references public.institutions (id) on delete set null,
  actor_user_id uuid references auth.users (id) on delete set null,
  actor_kind text not null check (actor_kind in ('member', 'system_admin', 'system')),
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_school_idx on public.audit_log (institution_id, created_at);

create function public.audit_log_append_only() returns trigger
language plpgsql set search_path = '' as $$
begin
  -- The retention job (DEC-08) may delete rows older than 2 years; nothing else may change the log.
  if tg_op = 'DELETE' and old.created_at < now() - interval '2 years' then
    return old;
  end if;
  raise exception 'audit_log is append-only' using errcode = '42501';
end $$;
create trigger audit_log_append_only before update or delete on public.audit_log
  for each row execute function public.audit_log_append_only();

create table public.exports (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  requested_by uuid references auth.users (id) on delete set null,
  filters jsonb not null default '{}'::jsonb,
  format text not null check (format in ('csv', 'xlsx')),
  row_count int,
  storage_path text,
  expires_at timestamptz not null default now() + interval '24 hours',
  downloaded_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.rate_limit_counters (
  key text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (key, window_start)
);

create table public.job_runs (
  id uuid primary key default gen_random_uuid(),
  job text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'succeeded', 'failed')),
  stats jsonb not null default '{}'::jsonb,
  error text
);
create index job_runs_job_idx on public.job_runs (job, started_at desc);

-- updated_at triggers ----------------------------------------------------------------------------------

create trigger touch_institutions before update on public.institutions for each row execute function public.touch_updated_at();
create trigger touch_memberships before update on public.institution_memberships for each row execute function public.touch_updated_at();
create trigger touch_user_preferences before update on public.user_preferences for each row execute function public.touch_updated_at();
create trigger touch_access_requests before update on public.access_requests for each row execute function public.touch_updated_at();
create trigger touch_alumni_profiles before update on public.alumni_profiles for each row execute function public.touch_updated_at();
create trigger touch_alumni_private before update on public.alumni_private for each row execute function public.touch_updated_at();
create trigger touch_email_templates before update on public.email_templates for each row execute function public.touch_updated_at();
create trigger touch_email_outbox before update on public.email_outbox for each row execute function public.touch_updated_at();

-- Reference data ---------------------------------------------------------------------------------------

insert into public.role_permissions (role, permission) values
  ('school_admin', 'directory.use'),
  ('school_admin', 'requests.read'), ('school_admin', 'requests.decide'),
  ('school_admin', 'records.read'), ('school_admin', 'records.edit'), ('school_admin', 'records.export'),
  ('school_admin', 'audit.read'), ('school_admin', 'freshness.read'), ('school_admin', 'metrics.read'),
  ('school_admin', 'templates.manage'), ('school_admin', 'staff.manage'), ('school_admin', 'settings.manage'),
  ('reviewer', 'directory.use'),
  ('reviewer', 'requests.read'), ('reviewer', 'requests.decide'), ('reviewer', 'records.read'),
  ('reviewer', 'audit.read'), ('reviewer', 'freshness.read'), ('reviewer', 'metrics.read'),
  ('alumni', 'directory.use');

insert into public.career_fields (key, label_en, label_fr, sort_order) values
  ('medicine', 'Medicine & Healthcare', 'Médecine et santé', 1),
  ('dentistry', 'Dentistry', 'Dentisterie', 2),
  ('pharmacy', 'Pharmacy', 'Pharmacie', 3),
  ('law', 'Law', 'Droit', 4),
  ('finance', 'Finance & Accounting', 'Finance et comptabilité', 5),
  ('banking', 'Banking & Investments', 'Banque et investissements', 6),
  ('technology', 'Technology', 'Technologie', 7),
  ('engineering', 'Engineering', 'Génie', 8),
  ('consulting', 'Consulting', 'Conseil', 9),
  ('entrepreneurship', 'Entrepreneurship & Startups', 'Entrepreneuriat et startups', 10),
  ('real_estate', 'Real Estate', 'Immobilier', 11),
  ('architecture', 'Architecture & Design', 'Architecture et design', 12),
  ('construction', 'Construction & Development', 'Construction et promotion', 13),
  ('education', 'Education', 'Éducation', 14),
  ('psychology', 'Psychology & Mental Health', 'Psychologie et santé mentale', 15),
  ('government', 'Government & Public Service', 'Gouvernement et service public', 16),
  ('nonprofit', 'Nonprofit & Community', 'Organismes sans but lucratif et communauté', 17),
  ('marketing', 'Marketing & Communications', 'Marketing et communications', 18),
  ('media', 'Media & Entertainment', 'Médias et divertissement', 19),
  ('arts', 'Arts & Creative', 'Arts et création', 20),
  ('sales', 'Sales & Business Development', 'Ventes et développement des affaires', 21),
  ('operations', 'Operations & Supply Chain', 'Opérations et chaîne d''approvisionnement', 22),
  ('retail', 'Retail & E-commerce', 'Commerce de détail et en ligne', 23),
  ('hospitality', 'Hospitality & Food', 'Hôtellerie et restauration', 24),
  ('sports', 'Sports & Fitness', 'Sports et conditionnement physique', 25),
  ('science', 'Science & Research', 'Sciences et recherche', 26),
  ('other', 'Other', 'Autre', 99);

insert into public.offer_types (key, label_en, label_fr, audience, sort_order) values
  ('mentoring', 'Mentoring', 'Mentorat', 'alumni', 1),
  ('career_advice', 'Career advice', 'Conseils de carrière', 'alumni', 2),
  ('job_opportunities', 'Open to job opportunities', 'Ouvert aux offres d''emploi', 'alumni', 3),
  ('offering_jobs', 'Hiring', 'Recrute', 'alumni', 4),
  ('offering_internships', 'Offering internships', 'Offre des stages', 'both', 5),
  ('shadowing', 'Offering shadowing', 'Offre de l''observation professionnelle', 'both', 6),
  ('speaking', 'Speaking at school events and panels', 'Conférences à l''école et panels', 'both', 7),
  ('networking', 'Networking & introductions', 'Réseautage et présentations', 'alumni', 8),
  ('entrepreneurship', 'Entrepreneurship & startup advice', 'Conseils en entrepreneuriat', 'alumni', 9),
  ('student_questions', 'Helping current students', 'Aider les élèves actuels', 'students', 10);

-- Platform default email texts. Schools start from these, edit them and approve their own copy (DEC-06);
-- the defaults themselves are never sent.
insert into public.email_templates (institution_id, key, locale, status, subject, body) values
  (null, 'access_approved', 'en', 'approved', 'Welcome to the {school_name} Alumni Network',
   E'Hi {first_name},\n\nYour request to join the {school_name} Alumni Network has been approved. Sign in to complete your profile:\n\n{sign_in_link}'),
  (null, 'access_approved', 'fr', 'approved', 'Bienvenue au Réseau des anciens de {school_name}',
   E'Bonjour {first_name},\n\nVotre demande d''adhésion au Réseau des anciens de {school_name} a été approuvée. Connectez-vous pour compléter votre profil :\n\n{sign_in_link}'),
  (null, 'access_needs_info', 'en', 'approved', 'We need a bit more information',
   E'Hi {first_name},\n\nThe {school_name} alumni office needs more information before approving your request:\n\n{message}\n\nReply here: {sign_in_link}'),
  (null, 'access_needs_info', 'fr', 'approved', 'Il nous faut un peu plus d''information',
   E'Bonjour {first_name},\n\nLe bureau des anciens de {school_name} a besoin de plus d''information avant d''approuver votre demande :\n\n{message}\n\nRépondez ici : {sign_in_link}'),
  (null, 'access_rejected', 'en', 'approved', 'About your {school_name} Alumni Network request',
   E'Hi {first_name},\n\nWe could not approve your request to join the {school_name} Alumni Network.\n\n{reason}\n\nIf you think this is a mistake, reply to this email.'),
  (null, 'access_rejected', 'fr', 'approved', 'Votre demande au Réseau des anciens de {school_name}',
   E'Bonjour {first_name},\n\nNous n''avons pas pu approuver votre demande d''adhésion au Réseau des anciens de {school_name}.\n\n{reason}\n\nSi vous pensez qu''il s''agit d''une erreur, répondez à ce courriel.'),
  (null, 'welcome', 'en', 'approved', 'Your profile is live',
   E'Hi {first_name},\n\nYour profile is now visible to fellow {school_name} alumni. You can change what you share at any time:\n\n{sign_in_link}'),
  (null, 'welcome', 'fr', 'approved', 'Votre profil est en ligne',
   E'Bonjour {first_name},\n\nVotre profil est maintenant visible par les anciens de {school_name}. Vous pouvez modifier ce que vous partagez en tout temps :\n\n{sign_in_link}'),
  (null, 'staff_invitation', 'en', 'approved', 'You are invited to manage the {school_name} Alumni Network',
   E'Hello,\n\nYou have been invited to help manage the {school_name} Alumni Network. Accept the invitation within 7 days:\n\n{action_link}'),
  (null, 'staff_invitation', 'fr', 'approved', 'Invitation à gérer le Réseau des anciens de {school_name}',
   E'Bonjour,\n\nVous êtes invité(e) à gérer le Réseau des anciens de {school_name}. Acceptez l''invitation d''ici 7 jours :\n\n{action_link}'),
  (null, 'annual_confirmation', 'en', 'approved', 'Is your {school_name} alumni profile still accurate?',
   E'Hi {first_name},\n\nIt has been a year since you last updated your profile. Please confirm it is still accurate, or update it:\n\n{confirm_link}'),
  (null, 'annual_confirmation', 'fr', 'approved', 'Votre profil d''ancien de {school_name} est-il à jour?',
   E'Bonjour {first_name},\n\nCela fait un an que vous avez mis à jour votre profil. Confirmez qu''il est toujours exact, ou modifiez-le :\n\n{confirm_link}'),
  (null, 'confirmation_reminder_1', 'en', 'approved', 'Reminder: is your profile still accurate?',
   E'Hi {first_name},\n\nA quick reminder to confirm or update your {school_name} alumni profile:\n\n{confirm_link}'),
  (null, 'confirmation_reminder_1', 'fr', 'approved', 'Rappel : votre profil est-il à jour?',
   E'Bonjour {first_name},\n\nPetit rappel pour confirmer ou mettre à jour votre profil d''ancien de {school_name} :\n\n{confirm_link}'),
  (null, 'confirmation_reminder_2', 'en', 'approved', 'Last reminder: confirm your profile',
   E'Hi {first_name},\n\nThis is the last reminder to confirm or update your {school_name} alumni profile:\n\n{confirm_link}'),
  (null, 'confirmation_reminder_2', 'fr', 'approved', 'Dernier rappel : confirmez votre profil',
   E'Bonjour {first_name},\n\nCeci est le dernier rappel pour confirmer ou mettre à jour votre profil d''ancien de {school_name} :\n\n{confirm_link}');
