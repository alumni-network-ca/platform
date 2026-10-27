-- Product V3: secure onboarding, claim-by-authenticated-email, and verification requests.

create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references public.institutions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  first_name text,
  last_name text,
  grad_year int,
  note text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null
);

alter table public.access_requests enable row level security;

drop policy if exists access_request_insert_self on public.access_requests;
create policy access_request_insert_self on public.access_requests
for insert to authenticated
with check (user_id=auth.uid());

drop policy if exists access_request_read_self_or_admin on public.access_requests;
create policy access_request_read_self_or_admin on public.access_requests
for select to authenticated
using (
  user_id=auth.uid()
  or (institution_id is not null and public.is_admin_of(institution_id))
  or public.is_super_admin()
);

drop policy if exists access_request_admin_update on public.access_requests;
create policy access_request_admin_update on public.access_requests
for update to authenticated
using (
  (institution_id is not null and public.is_admin_of(institution_id))
  or public.is_super_admin()
)
with check (
  (institution_id is not null and public.is_admin_of(institution_id))
  or public.is_super_admin()
);

create or replace function public.claim_my_profile()
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_email text;
  v_profile_id uuid;
  v_institution_id uuid;
begin
  v_email := lower(coalesce(auth.jwt()->>'email',''));
  if v_email = '' then
    raise exception 'No authenticated email was found.';
  end if;

  select p.id,p.institution_id into v_profile_id,v_institution_id
  from public.alumni_profiles p
  join public.institutions i on i.id=p.institution_id
  where i.slug='herzliah'
    and p.user_id is null
    and p.claim_email is not null
    and lower(p.claim_email)=v_email
  limit 1;

  if v_profile_id is null then
    return null;
  end if;

  update public.alumni_profiles
  set user_id=auth.uid(),
      claimed_at=coalesce(claimed_at,now()),
      last_confirmed_at=now(),
      is_directory_visible=false
  where id=v_profile_id and user_id is null;

  insert into public.institution_memberships(institution_id,user_id,role,status)
  values(v_institution_id,auth.uid(),'alumni','active')
  on conflict(institution_id,user_id) do nothing;

  insert into public.availability_flags(profile_id,institution_id)
  values(v_profile_id,v_institution_id)
  on conflict(profile_id) do nothing;

  insert into public.audit_log(institution_id,actor_user_id,action,target_type,target_id)
  values(v_institution_id,auth.uid(),'profile_claimed','alumni_profile',v_profile_id::text);

  return v_profile_id;
end;
$$;

grant execute on function public.claim_my_profile() to authenticated;
