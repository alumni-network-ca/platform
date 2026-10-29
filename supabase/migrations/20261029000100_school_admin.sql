-- School console readers. These return school-scoped data only and deliberately do not audit reads.
create function public.school_staff(p_inst uuid)
returns table(user_id uuid, role public.member_role, status public.member_status, joined_at timestamptz, email text, name text)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.assert_permission(p_inst, 'staff.manage');
  return query
  select m.user_id, m.role, m.status, m.created_at, u.email::text,
    coalesce((select concat_ws(' ', coalesce(p.preferred_name, p.first_name), p.last_name)
              from public.alumni_profiles p where p.institution_id = p_inst and p.user_id = m.user_id and p.status <> 'deleted'),
             (select concat_ws(' ', r.first_name, r.last_name) from public.access_requests r
              where r.institution_id = p_inst and r.user_id = m.user_id order by r.created_at desc, r.id limit 1))
  from public.institution_memberships m join auth.users u on u.id = m.user_id
  where m.institution_id = p_inst and m.status = 'active' and m.role in ('school_admin', 'reviewer')
  order by m.created_at, m.user_id;
end $$;

create function public.audit_people(p_inst uuid)
returns table(user_id uuid, label text, kind text)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.assert_permission(p_inst, 'audit.read');
  return query
  with actors as (
    select a.actor_user_id as uid from public.audit_log a where a.institution_id = p_inst and a.actor_user_id is not null
    union
    select m.user_id from public.institution_memberships m
    where m.institution_id = p_inst and m.status = 'active' and m.role in ('school_admin', 'reviewer')
  ), people as (
    select a.uid, exists(select 1 from public.platform_admins pa where pa.user_id = a.uid)
      or exists(select 1 from public.audit_log l where l.institution_id = p_inst and l.actor_user_id = a.uid and l.actor_kind = 'system_admin') as support,
      exists(select 1 from public.institution_memberships m where m.institution_id = p_inst and m.user_id = a.uid
        and m.status = 'active' and m.role in ('school_admin', 'reviewer')) as staff
    from actors a
  )
  select a.uid, case when a.support then 'Platform support' else
    coalesce((select concat_ws(' ', coalesce(p.preferred_name, p.first_name), p.last_name)
              from public.alumni_profiles p where p.institution_id = p_inst and p.user_id = a.uid and p.status <> 'deleted'),
             (select concat_ws(' ', r.first_name, r.last_name) from public.access_requests r
              where r.institution_id = p_inst and r.user_id = a.uid order by r.created_at desc, r.id limit 1), u.email::text, 'Former user') end,
    case when a.support then 'support' when a.staff then 'staff' else 'former' end
  from people a left join auth.users u on u.id = a.uid order by a.uid;
end $$;

create function public.admin_dashboard(p_inst uuid, p_since timestamptz default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.assert_permission(p_inst, 'metrics.read');
  return jsonb_build_object(
    'pending', (select count(*) from public.access_requests where institution_id = p_inst and status = 'pending'),
    'needs_info', (select count(*) from public.access_requests where institution_id = p_inst and status = 'needs_info'),
    'oldest_pending_at', (select min(created_at) from public.access_requests where institution_id = p_inst and status = 'pending'),
    'approved_not_published', (select count(*) from public.access_requests r join public.alumni_profiles p on p.id = r.profile_id
      where r.institution_id = p_inst and r.status = 'approved' and p.status = 'active' and p.published_at is null
        and (p_since is null or r.decided_at >= p_since)),
    'published', (select count(*) from public.alumni_profiles where institution_id = p_inst and status = 'active'
      and visibility = 'members' and published_at is not null and (p_since is null or published_at >= p_since))
  );
end $$;

create function public.admin_roster(p_inst uuid, p_query text default null, p_state text default null,
  p_class_min int default null, p_class_max int default null, p_limit int default 25, p_offset int default 0)
returns table(id uuid, first_name text, last_name text, preferred_name text, grad_year int, city text, country text,
  job_title text, employer text, state text, last_confirmed_at timestamptz, total_count bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.assert_permission(p_inst, 'records.read');
  if p_state is not null and p_state not in ('published', 'hidden', 'onboarding', 'suspended', 'archived', 'deceased') then
    raise exception 'invalid roster state' using errcode = '22023';
  end if;
  if p_limit is null or p_limit not between 1 and 100 or p_offset is null or p_offset < 0
    or p_class_min > p_class_max or length(p_query) > 200 then
    raise exception 'invalid roster filters' using errcode = '22023';
  end if;
  return query
  with records as (
    select p.*, case when p.status <> 'active' then p.status::text
      when p.onboarding_completed_at is null then 'onboarding'
      when p.visibility = 'members' and p.published_at is not null then 'published' else 'hidden' end as roster_state
    from public.alumni_profiles p
    left join public.alumni_private pr on pr.profile_id = p.id and pr.institution_id = p_inst
    left join auth.users u on u.id = p.user_id
    where p.institution_id = p_inst and p.status <> 'deleted'
      and (p_class_min is null or p.grad_year >= p_class_min) and (p_class_max is null or p.grad_year <= p_class_max)
      and (nullif(trim(p_query), '') is null
        or lower(p.first_name || ' ' || p.last_name || ' ' || coalesce(p.preferred_name, '')) like '%' || lower(trim(p_query)) || '%'
        or pr.maiden_name ilike '%' || trim(p_query) || '%' or u.email ilike '%' || trim(p_query) || '%')
  )
  select r.id, r.first_name, r.last_name, r.preferred_name, r.grad_year, r.city, r.country, r.job_title, r.employer,
    r.roster_state, r.last_confirmed_at, count(*) over ()
  from records r where p_state is null or r.roster_state = p_state
  order by lower(r.last_name), lower(r.first_name), r.id limit p_limit offset p_offset;
end $$;

create function public.admin_profile_email(p_profile uuid) returns text
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.assert_permission((select institution_id from public.alumni_profiles where id = p_profile), 'records.read');
  return (select u.email::text from public.alumni_profiles p join auth.users u on u.id = p.user_id where p.id = p_profile);
end $$;

create function public.access_request_matches(p_requests uuid[])
returns table(request_id uuid, profile_id uuid, first_name text, last_name text, grad_year int, claimed boolean, score real)
language plpgsql stable security definer set search_path = '' as $$
declare v_inst uuid;
begin
  -- Check every requested school before returning anything, including mixed-school batches.
  perform public.assert_permission((select institution_id from public.access_requests where id = p_requests[1]), 'requests.read');
  if cardinality(p_requests) > 100 then raise exception 'too many requests' using errcode = '22023'; end if;
  if exists (
    select 1 from unnest(p_requests) rid where not exists(select 1 from public.access_requests r where r.id = rid)
  ) then raise exception 'not allowed' using errcode = '42501'; end if;
  for v_inst in select distinct institution_id from public.access_requests where id = any(p_requests) loop
    perform public.assert_permission(v_inst, 'requests.read');
  end loop;
  return query
  select r.id, p.id, p.first_name, p.last_name, p.grad_year, p.user_id is not null,
    greatest(extensions.similarity(lower(r.last_name), lower(p.last_name)),
      extensions.similarity(lower(coalesce(r.maiden_name, r.last_name)), lower(p.last_name)),
      extensions.similarity(lower(r.last_name), lower(coalesce(pr.maiden_name, p.last_name)))) as score
  from public.access_requests r
  join public.alumni_profiles p on p.institution_id = r.institution_id and p.grad_year = r.grad_year and p.status = 'active'
  left join public.alumni_private pr on pr.profile_id = p.id and pr.institution_id = r.institution_id
  where r.id = any(p_requests) and extensions.similarity(lower(r.first_name), lower(p.first_name)) >= 0.4
    and greatest(extensions.similarity(lower(r.last_name), lower(p.last_name)),
      extensions.similarity(lower(coalesce(r.maiden_name, r.last_name)), lower(p.last_name)),
      extensions.similarity(lower(r.last_name), lower(coalesce(pr.maiden_name, p.last_name)))) >= 0.4
  order by r.id, score desc, p.id;
end $$;

revoke all on function public.school_staff(uuid), public.audit_people(uuid), public.admin_dashboard(uuid, timestamptz),
  public.admin_roster(uuid, text, text, int, int, int, int), public.admin_profile_email(uuid), public.access_request_matches(uuid[])
  from public, anon;
grant execute on function public.school_staff(uuid), public.audit_people(uuid), public.admin_dashboard(uuid, timestamptz),
  public.admin_roster(uuid, text, text, int, int, int, int), public.admin_profile_email(uuid), public.access_request_matches(uuid[])
  to authenticated;

-- Forward-only corrections to existing write paths. Existing execute privileges are preserved.
create or replace function public.validate_template_text(p_subject text, p_body text) returns void
language plpgsql immutable set search_path = '' as $$
declare
  v_name text;
begin
  if position('<' in p_subject) > 0 or position('<' in p_body) > 0 then
    raise exception 'templates are plain text: HTML is not allowed' using errcode = '22023';
  end if;
  for v_name in select (regexp_matches(p_subject || ' ' || p_body, '\{([^}]*)\}', 'g'))[1] loop
    if v_name not in ('first_name', 'school_name', 'sign_in_link', 'action_link', 'confirm_link', 'reason', 'message', 'graduation_year', 'onboarding_link') then
      raise exception 'unknown placeholder {%}', v_name using errcode = '22023';
    end if;
  end loop;
end $$;

create or replace function public.set_profile_status(p_profile uuid, p_status public.profile_status, p_reason text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_profile public.alumni_profiles;
begin
  select * into v_profile from public.alumni_profiles where id = p_profile for update;
  if not found then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  perform public.assert_permission(v_profile.institution_id, 'records.edit');
  if p_status = 'deleted' or v_profile.status = 'deleted' then
    raise exception 'deleted profiles are handled by the retention job' using errcode = '22023';
  end if;
  if p_status <> 'active' and coalesce(trim(p_reason), '') = '' then
    raise exception 'a reason is required' using errcode = '22023';
  end if;

  update public.alumni_profiles set status = p_status where id = p_profile;
  if v_profile.user_id is not null then
    update public.institution_memberships
    set status = case when p_status = 'active' then 'active' else 'suspended' end::public.member_status,
        status_reason = nullif(trim(p_reason), ''), status_changed_by = auth.uid(), status_changed_at = now()
    where institution_id = v_profile.institution_id and user_id = v_profile.user_id and role = 'alumni';
  end if;
  perform public.log_audit(v_profile.institution_id, 'profile.status', 'alumni_profile', p_profile::text,
    jsonb_build_object('from', v_profile.status, 'to', p_status, 'reason', nullif(trim(p_reason), '')));
end $$;

create or replace function public.accept_staff_invitation(p_token text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_inv public.staff_invitations;
begin
  select * into v_inv from public.staff_invitations
  where token_hash = public.hash_token(p_token) and accepted_at is null and revoked_at is null and expires_at > now()
    and lower(email) = (select lower(email) from auth.users where id = auth.uid())
  for update;
  if not found then
    raise exception 'this invitation is not valid for your account' using errcode = '42501';
  end if;

  insert into public.institution_memberships (institution_id, user_id, role)
  values (v_inv.institution_id, auth.uid(), v_inv.role)
  on conflict (institution_id, user_id) do update
    set role = case when public.institution_memberships.status = 'active' and public.institution_memberships.role = 'school_admin'
                    then public.institution_memberships.role else excluded.role end, status = 'active', status_reason = null, status_changed_at = now();
  update public.staff_invitations set accepted_by = auth.uid(), accepted_at = now() where id = v_inv.id;
  perform public.log_audit(v_inv.institution_id, 'staff.joined', 'staff_invitation', v_inv.id::text,
    jsonb_build_object('role', (select role from public.institution_memberships where institution_id = v_inv.institution_id and user_id = auth.uid())));
  return v_inv.institution_id;
end $$;
