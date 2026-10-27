-- V4 full profile package

alter table public.alumni_profiles add column if not exists onboarding_completed_at timestamptz;

create table if not exists public.alumni_experience(
 id uuid primary key default gen_random_uuid(),
 profile_id uuid not null references public.alumni_profiles(id) on delete cascade,
 institution_id uuid not null references public.institutions(id) on delete cascade,
 job_title text not null,
 employer text not null default '',
 career_field text,
 location text,
 start_year int,
 end_year int,
 is_current boolean not null default false,
 sort_order int not null default 0,
 created_at timestamptz not null default now()
);
create index if not exists alumni_experience_profile_idx on public.alumni_experience(profile_id,sort_order);
alter table public.alumni_experience enable row level security;
drop policy if exists experience_read_same_tenant on public.alumni_experience;
create policy experience_read_same_tenant on public.alumni_experience for select to authenticated using(public.is_member_of(institution_id) or public.is_admin_of(institution_id) or public.is_super_admin());
drop policy if exists experience_owner_admin_write on public.alumni_experience;
create policy experience_owner_admin_write on public.alumni_experience for all to authenticated
using(exists(select 1 from public.alumni_profiles p where p.id=profile_id and (p.user_id=auth.uid() or public.is_admin_of(p.institution_id) or public.is_super_admin())))
with check(exists(select 1 from public.alumni_profiles p where p.id=profile_id and (p.user_id=auth.uid() or public.is_admin_of(p.institution_id) or public.is_super_admin())));

create table if not exists public.alumni_education(
 id uuid primary key default gen_random_uuid(),
 profile_id uuid not null references public.alumni_profiles(id) on delete cascade,
 institution_id uuid not null references public.institutions(id) on delete cascade,
 school text not null,
 degree text,
 field_of_study text,
 graduation_year int,
 sort_order int not null default 0,
 created_at timestamptz not null default now()
);
create index if not exists alumni_education_profile_idx on public.alumni_education(profile_id,sort_order);
alter table public.alumni_education enable row level security;
drop policy if exists education_read_same_tenant on public.alumni_education;
create policy education_read_same_tenant on public.alumni_education for select to authenticated using(public.is_member_of(institution_id) or public.is_admin_of(institution_id) or public.is_super_admin());
drop policy if exists education_owner_admin_write on public.alumni_education;
create policy education_owner_admin_write on public.alumni_education for all to authenticated
using(exists(select 1 from public.alumni_profiles p where p.id=profile_id and (p.user_id=auth.uid() or public.is_admin_of(p.institution_id) or public.is_super_admin())))
with check(exists(select 1 from public.alumni_profiles p where p.id=profile_id and (p.user_id=auth.uid() or public.is_admin_of(p.institution_id) or public.is_super_admin())));

-- Normalize the 50 demo profiles into broad Career fields used by the new directory.
update public.alumni_profiles set profession=case
 when profession='Physician' then 'Medicine & Healthcare'
 when profession='Dentist' then 'Dentistry'
 when profession='Lawyer' then 'Law'
 when profession in ('Software Engineer','Product Manager') then 'Technology'
 when profession in ('Finance','Accountant') then 'Finance & Accounting'
 when profession='Entrepreneur' then 'Entrepreneurship'
 when profession='Architect' then 'Architecture & Design'
 when profession='Psychologist' then 'Psychology & Mental Health'
 when profession='Engineer' then 'Engineering'
 when profession='Consultant' then 'Consulting'
 else profession end
where id::text like '00000000-0000-4000-8000-%';

-- Demo profiles are already complete.
update public.alumni_profiles set onboarding_completed_at=coalesce(onboarding_completed_at,now())
where id::text like '00000000-0000-4000-8000-%';

-- Seed structured education from the existing university arrays for the 50 demos.
insert into public.alumni_education(profile_id,institution_id,school,sort_order)
select p.id,p.institution_id,u.school,0
from public.alumni_profiles p
cross join lateral (select unnest(p.universities) as school) u
where p.id::text like '00000000-0000-4000-8000-%'
  and not exists(select 1 from public.alumni_education e where e.profile_id=p.id);

-- Seed current experience for demo profiles.
insert into public.alumni_experience(profile_id,institution_id,job_title,employer,career_field,location,is_current,sort_order)
select p.id,p.institution_id,coalesce(p.job_title,'Current role'),coalesce(p.current_employer,''),p.profession,p.current_city,true,0
from public.alumni_profiles p
where p.id::text like '00000000-0000-4000-8000-%'
and not exists(select 1 from public.alumni_experience e where e.profile_id=p.id and e.is_current=true);

select count(*) as demo_profiles_ready from public.alumni_profiles where id::text like '00000000-0000-4000-8000-%';
