create extension if not exists pgcrypto;

do $$ begin create type public.member_role as enum ('super_admin','institution_admin','alumni','student'); exception when duplicate_object then null; end $$;
do $$ begin create type public.member_status as enum ('active','suspended'); exception when duplicate_object then null; end $$;

create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  primary_color text default '#0B2159',
  accent_color text default '#7B1E3D',
  created_at timestamptz not null default now()
);

create table if not exists public.institution_memberships (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'alumni',
  status public.member_status not null default 'active',
  created_at timestamptz not null default now(),
  unique(institution_id,user_id)
);

create table if not exists public.alumni_profiles (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  claim_email text,
  first_name text not null,
  last_name text not null,
  grad_year int check (grad_year is null or grad_year between 1900 and 2100),
  bio text,current_city text,current_country text,current_employer text,job_title text,profession text,industry text,
  universities text[] not null default '{}',degrees text[] not null default '{}',languages text[] not null default '{}',
  linkedin_url text,website_url text,
  privacy_preset text not null default 'alumni_only' check (privacy_preset in ('alumni_only','admins_only','hidden')),
  contact_allowed boolean not null default true,
  is_directory_visible boolean not null default false,
  claimed_at timestamptz,last_confirmed_at timestamptz,
  created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  unique(institution_id,user_id)
);

create unique index if not exists unique_unclaimed_email_per_institution on public.alumni_profiles(institution_id,lower(claim_email)) where user_id is null and claim_email is not null;

create table if not exists public.availability_flags (
  profile_id uuid primary key references public.alumni_profiles(id) on delete cascade,
  institution_id uuid not null references public.institutions(id) on delete cascade,
  mentoring boolean not null default false,career_advice boolean not null default false,job_opportunities boolean not null default false,
  offering_jobs boolean not null default false,offering_internships boolean not null default false,shadowing boolean not null default false,
  speaking boolean not null default false,networking boolean not null default false,entrepreneurship boolean not null default false
);

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(), institution_id uuid not null references public.institutions(id) on delete cascade,
  alumni_profile_id uuid not null references public.alumni_profiles(id) on delete cascade, token_hash text not null unique,
  expires_at timestamptz not null,sent_at timestamptz,claimed_at timestamptz,created_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,institution_id uuid references public.institutions(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,action text not null,target_type text,target_id text,
  metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now()
);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
drop trigger if exists trg_alumni_updated_at on public.alumni_profiles;
create trigger trg_alumni_updated_at before update on public.alumni_profiles for each row execute function public.touch_updated_at();

create or replace function public.is_member_of(p_institution uuid) returns boolean language sql stable security definer set search_path=public as $$
select exists(select 1 from public.institution_memberships m where m.institution_id=p_institution and m.user_id=auth.uid() and m.status='active'); $$;
create or replace function public.is_admin_of(p_institution uuid) returns boolean language sql stable security definer set search_path=public as $$
select exists(select 1 from public.institution_memberships m where m.institution_id=p_institution and m.user_id=auth.uid() and m.status='active' and m.role in ('institution_admin','super_admin')); $$;
create or replace function public.is_super_admin() returns boolean language sql stable security definer set search_path=public as $$
select exists(select 1 from public.institution_memberships m where m.user_id=auth.uid() and m.status='active' and m.role='super_admin'); $$;

create or replace function public.find_claimable_profile(p_email text) returns table(found boolean) language sql security definer set search_path=public as $$
select true from public.alumni_profiles p join public.institutions i on i.id=p.institution_id where i.slug='herzliah' and p.user_id is null and lower(p.claim_email)=lower(trim(p_email)) limit 1; $$;
grant execute on function public.find_claimable_profile(text) to anon, authenticated;

alter table public.institutions enable row level security;
alter table public.institution_memberships enable row level security;
alter table public.alumni_profiles enable row level security;
alter table public.availability_flags enable row level security;
alter table public.invitations enable row level security;
alter table public.audit_log enable row level security;

create policy institutions_read_member on public.institutions for select to authenticated using (public.is_member_of(id) or public.is_super_admin());
create policy memberships_read_self_or_admin on public.institution_memberships for select to authenticated using (user_id=auth.uid() or public.is_admin_of(institution_id) or public.is_super_admin());
create policy profiles_read_same_tenant on public.alumni_profiles for select to authenticated using (public.is_admin_of(institution_id) or (public.is_member_of(institution_id) and claimed_at is not null and is_directory_visible=true and privacy_preset='alumni_only') or user_id=auth.uid());
create policy profiles_insert_admin on public.alumni_profiles for insert to authenticated with check (public.is_admin_of(institution_id) or public.is_super_admin());
create policy profiles_update_owner_admin on public.alumni_profiles for update to authenticated using (user_id=auth.uid() or public.is_admin_of(institution_id) or public.is_super_admin()) with check (user_id=auth.uid() or public.is_admin_of(institution_id) or public.is_super_admin());
create policy profiles_delete_admin on public.alumni_profiles for delete to authenticated using (public.is_admin_of(institution_id) or public.is_super_admin());
create policy availability_read_same_tenant on public.availability_flags for select to authenticated using (public.is_member_of(institution_id) or public.is_admin_of(institution_id) or public.is_super_admin());
create policy availability_write_owner_admin on public.availability_flags for all to authenticated using (exists(select 1 from public.alumni_profiles p where p.id=profile_id and (p.user_id=auth.uid() or public.is_admin_of(p.institution_id) or public.is_super_admin()))) with check (exists(select 1 from public.alumni_profiles p where p.id=profile_id and (p.user_id=auth.uid() or public.is_admin_of(p.institution_id) or public.is_super_admin())));
create policy invitations_admin_only on public.invitations for all to authenticated using (public.is_admin_of(institution_id) or public.is_super_admin()) with check (public.is_admin_of(institution_id) or public.is_super_admin());
create policy audit_admin_read on public.audit_log for select to authenticated using (public.is_admin_of(institution_id) or public.is_super_admin());

insert into public.institutions(name,slug,primary_color,accent_color) values ('Herzliah High School','herzliah','#0B2159','#7B1E3D') on conflict (slug) do update set name=excluded.name;

-- After creating your own Auth user, make yourself Super Admin with:
-- insert into public.institution_memberships(institution_id,user_id,role)
-- select id,'YOUR_AUTH_USER_UUID'::uuid,'super_admin' from public.institutions where slug='herzliah';
