-- ONB-09: the school's student ID (matricule) on the access request, used to help reviewers match.
-- The ID is self-reported and only a hint: a person still approves every request (ADR 0004, DEC-01).
-- Staff can also find a record by its student ID on the roster.

-- One normal form for both columns, so values typed differently compare equal: no spaces or dashes, upper case,
-- and empty becomes null.
create function public.normalize_student_id(p_value text) returns text
language sql immutable set search_path = '' as $$
  select nullif(upper(regexp_replace(coalesce(p_value, ''), '[[:space:]-]+', '', 'g')), '')
$$;

update public.alumni_private set school_student_id = public.normalize_student_id(school_student_id)
where school_student_id is distinct from public.normalize_student_id(school_student_id);

alter table public.alumni_private
  add constraint alumni_private_student_id_normalized
  check (school_student_id is not distinct from public.normalize_student_id(school_student_id));

alter table public.access_requests
  add column school_student_id text check (length(school_student_id) <= 40),
  add constraint access_requests_student_id_normalized
  check (school_student_id is not distinct from public.normalize_student_id(school_student_id));

-- Not unique: applicants mistype, and staff fix it.
create index alumni_private_student_id_idx on public.alumni_private (institution_id, school_student_id)
where school_student_id is not null;

-- request_access gains the optional ID. The response still never says whether the ID is known (S4).
drop function public.request_access(uuid, text, text, text, int, text);
create function public.request_access(
  p_inst uuid, p_first_name text, p_last_name text, p_maiden_name text, p_grad_year int, p_note text,
  p_school_student_id text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_confirmed timestamptz;
  v_id uuid;
  v_student_id text := public.normalize_student_id(p_school_student_id);
begin
  if v_uid is null then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select email, email_confirmed_at into v_email, v_confirmed from auth.users where id = v_uid;
  if v_confirmed is null then
    raise exception 'verify your email first' using errcode = '42501';
  end if;
  if not exists (select 1 from public.institutions where id = p_inst and status = 'active') then
    raise exception 'unknown school' using errcode = '22023';
  end if;
  if length(v_student_id) > 40 then
    raise exception 'student ID is too long' using errcode = '22023';
  end if;
  if not public.hit_rate_limit('request_access:' || v_uid, 10, interval '1 hour') then
    raise exception 'too many requests, try again later' using errcode = '54000';
  end if;
  -- Already has a profile here: succeed silently, so the response never reveals state (S4).
  if exists (select 1 from public.alumni_profiles where institution_id = p_inst and user_id = v_uid) then
    return;
  end if;

  update public.access_requests
  set first_name = trim(p_first_name), last_name = trim(p_last_name), maiden_name = nullif(trim(p_maiden_name), ''),
      grad_year = p_grad_year, note = nullif(trim(p_note), ''), school_student_id = v_student_id, email = v_email,
      status = 'pending'
  where institution_id = p_inst and user_id = v_uid and status in ('pending', 'needs_info')
  returning id into v_id;

  if v_id is null then
    insert into public.access_requests (institution_id, user_id, source, email, first_name, last_name, maiden_name,
      grad_year, note, school_student_id)
    values (p_inst, v_uid, 'signup', v_email, trim(p_first_name), trim(p_last_name),
            nullif(trim(p_maiden_name), ''), p_grad_year, nullif(trim(p_note), ''), v_student_id)
    returning id into v_id;
    perform public.log_audit(p_inst, 'access_request.created', 'access_request', v_id::text);
  end if;
end $$;

-- Approving copies the ID: a new record gets it; a linked record gets it only if staff haven't entered one.
create or replace function public.decide_access_request(
  p_request uuid, p_decision text, p_reason text default null, p_link_profile uuid default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  r public.access_requests;
  v_profile uuid;
begin
  select * into r from public.access_requests where id = p_request for update;
  if not found then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  perform public.assert_permission(r.institution_id, 'requests.decide');
  if r.status not in ('pending', 'needs_info') then
    raise exception 'this request has already been decided' using errcode = '22023';
  end if;

  if p_decision = 'approve' then
    if p_link_profile is not null then
      update public.alumni_profiles set user_id = r.user_id
      where id = p_link_profile and institution_id = r.institution_id and user_id is null
      returning id into v_profile;
      if v_profile is null then
        raise exception 'that record cannot be linked' using errcode = '22023';
      end if;
      if r.school_student_id is not null then
        insert into public.alumni_private (profile_id, institution_id, school_student_id)
        values (v_profile, r.institution_id, r.school_student_id)
        on conflict (profile_id) do update
          set school_student_id = coalesce(public.alumni_private.school_student_id, excluded.school_student_id);
      end if;
    else
      if exists (select 1 from public.alumni_profiles where institution_id = r.institution_id and user_id = r.user_id) then
        raise exception 'this person already has a profile' using errcode = '23505';
      end if;
      insert into public.alumni_profiles (institution_id, user_id, first_name, last_name, grad_year)
      values (r.institution_id, r.user_id, r.first_name, r.last_name, r.grad_year)
      returning id into v_profile;
      insert into public.alumni_private (profile_id, institution_id, maiden_name, school_student_id)
      values (v_profile, r.institution_id, r.maiden_name, r.school_student_id);
    end if;

    -- Keep an active staff role; otherwise (new, or a revoked/suspended membership) become an active alumnus.
    insert into public.institution_memberships (institution_id, user_id, role)
    values (r.institution_id, r.user_id, 'alumni')
    on conflict (institution_id, user_id) do update
      set role = case when public.institution_memberships.status = 'active'
                      then public.institution_memberships.role else 'alumni' end,
          status = 'active', status_reason = null, status_changed_by = auth.uid(), status_changed_at = now();

    update public.access_requests
    set status = 'approved', profile_id = v_profile, decided_by = auth.uid(), decided_at = now()
    where id = p_request;
    perform public.enqueue_email(r.institution_id, 'access_approved', r.user_id, r.email, p_request);

  elsif p_decision = 'needs_info' then
    if coalesce(trim(p_reason), '') = '' then
      raise exception 'say what information is needed' using errcode = '22023';
    end if;
    update public.access_requests
    set status = 'needs_info', info_request = trim(p_reason), decided_by = auth.uid(), decided_at = now()
    where id = p_request;
    perform public.enqueue_email(r.institution_id, 'access_needs_info', r.user_id, r.email, p_request);

  elsif p_decision = 'reject' then
    update public.access_requests
    set status = 'rejected', decision_reason = nullif(trim(p_reason), ''), decided_by = auth.uid(), decided_at = now()
    where id = p_request;
    perform public.enqueue_email(r.institution_id, 'access_rejected', r.user_id, r.email, p_request);

  else
    raise exception 'unknown decision %', p_decision using errcode = '22023';
  end if;

  perform public.log_audit(r.institution_id, 'access_request.' || p_decision, 'access_request', p_request::text,
    jsonb_build_object('profile_id', v_profile, 'linked', p_link_profile is not null));
  return v_profile;
end $$;

-- Staff edits store the same normal form.
create or replace function public.admin_update_profile(p_profile uuid, p_patch jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_inst uuid;
begin
  select institution_id into v_inst from public.alumni_profiles where id = p_profile;
  if v_inst is null then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  perform public.assert_permission(v_inst, 'records.edit');

  update public.alumni_profiles set
    first_name = case when p_patch ? 'first_name' then trim(p_patch ->> 'first_name') else first_name end,
    last_name = case when p_patch ? 'last_name' then trim(p_patch ->> 'last_name') else last_name end,
    preferred_name = case when p_patch ? 'preferred_name' then nullif(trim(p_patch ->> 'preferred_name'), '') else preferred_name end,
    grad_year = case when p_patch ? 'grad_year' then (p_patch ->> 'grad_year')::int else grad_year end,
    city = case when p_patch ? 'city' then nullif(trim(p_patch ->> 'city'), '') else city end,
    country = case when p_patch ? 'country' then nullif(trim(p_patch ->> 'country'), '') else country end,
    job_title = case when p_patch ? 'job_title' then nullif(trim(p_patch ->> 'job_title'), '') else job_title end,
    employer = case when p_patch ? 'employer' then nullif(trim(p_patch ->> 'employer'), '') else employer end
  where id = p_profile;

  if p_patch ?| array['maiden_name', 'admin_notes', 'school_student_id'] then
    insert into public.alumni_private (profile_id, institution_id) values (p_profile, v_inst) on conflict (profile_id) do nothing;
    update public.alumni_private set
      maiden_name = case when p_patch ? 'maiden_name' then nullif(trim(p_patch ->> 'maiden_name'), '') else maiden_name end,
      admin_notes = case when p_patch ? 'admin_notes' then nullif(trim(p_patch ->> 'admin_notes'), '') else admin_notes end,
      school_student_id = case when p_patch ? 'school_student_id'
        then public.normalize_student_id(p_patch ->> 'school_student_id') else school_student_id end
    where profile_id = p_profile;
  end if;

  perform public.log_audit(v_inst, 'profile.admin_updated', 'alumni_profile', p_profile::text,
    jsonb_build_object('fields', (select jsonb_agg(k) from jsonb_object_keys(p_patch) k)));
end $$;

-- An exact match on the student ID, within the same school, comes first with score 1.0. It ignores the graduation
-- year, so a mistyped year doesn't hide it. The record's own ID is returned so a reviewer can compare the two.
drop function public.access_request_matches(uuid[]);
create function public.access_request_matches(p_requests uuid[])
returns table(request_id uuid, profile_id uuid, first_name text, last_name text, grad_year int, claimed boolean, score real,
  id_match boolean, school_student_id text)
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
  select d.request_id, d.profile_id, d.first_name, d.last_name, d.grad_year, d.claimed, d.score, d.id_match, d.school_student_id
  from (
    select distinct on (m.request_id, m.profile_id) m.*
    from (
      select r.id, p.id, p.first_name, p.last_name, p.grad_year, p.user_id is not null, 1.0::real, true, pr.school_student_id
      from public.access_requests r
      join public.alumni_private pr on pr.institution_id = r.institution_id and pr.school_student_id = r.school_student_id
      join public.alumni_profiles p on p.id = pr.profile_id and p.status = 'active'
      where r.id = any(p_requests) and r.school_student_id is not null
      union all
      select r.id, p.id, p.first_name, p.last_name, p.grad_year, p.user_id is not null,
        greatest(extensions.similarity(lower(r.last_name), lower(p.last_name)),
          extensions.similarity(lower(coalesce(r.maiden_name, r.last_name)), lower(p.last_name)),
          extensions.similarity(lower(r.last_name), lower(coalesce(pr.maiden_name, p.last_name)))),
        false, pr.school_student_id
      from public.access_requests r
      join public.alumni_profiles p on p.institution_id = r.institution_id and p.grad_year = r.grad_year and p.status = 'active'
      left join public.alumni_private pr on pr.profile_id = p.id and pr.institution_id = r.institution_id
      where r.id = any(p_requests) and extensions.similarity(lower(r.first_name), lower(p.first_name)) >= 0.4
        and greatest(extensions.similarity(lower(r.last_name), lower(p.last_name)),
          extensions.similarity(lower(coalesce(r.maiden_name, r.last_name)), lower(p.last_name)),
          extensions.similarity(lower(r.last_name), lower(coalesce(pr.maiden_name, p.last_name)))) >= 0.4
    ) m(request_id, profile_id, first_name, last_name, grad_year, claimed, score, id_match, school_student_id)
    order by m.request_id, m.profile_id, m.id_match desc
  ) d
  order by d.request_id, d.id_match desc, d.score desc, d.profile_id;
end $$;

-- The roster search also finds a record by its exact student ID, typed in any form.
create or replace function public.admin_roster(p_inst uuid, p_query text default null, p_state text default null,
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
        or pr.maiden_name ilike '%' || trim(p_query) || '%' or u.email ilike '%' || trim(p_query) || '%'
        or pr.school_student_id = public.normalize_student_id(p_query))
  )
  select r.id, r.first_name, r.last_name, r.preferred_name, r.grad_year, r.city, r.country, r.job_title, r.employer,
    r.roster_state, r.last_confirmed_at, count(*) over ()
  from records r where p_state is null or r.roster_state = p_state
  order by lower(r.last_name), lower(r.first_name), r.id limit p_limit offset p_offset;
end $$;

-- The owner may see their own student ID (DEC-02 as amended), so their data export includes it.
create or replace function public.export_my_data(p_inst uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_profile uuid;
  v_data jsonb;
begin
  select id into v_profile from public.alumni_profiles where institution_id = p_inst and user_id = auth.uid();
  select jsonb_build_object(
    'profile', (select to_jsonb(p) - 'institution_id' from public.alumni_profiles p where p.id = v_profile),
    'maiden_name', (select maiden_name from public.alumni_private where profile_id = v_profile),
    'school_student_id', (select school_student_id from public.alumni_private where profile_id = v_profile),
    'contact_channels', coalesce((select jsonb_agg(jsonb_build_object('type', type, 'value', value, 'is_public', is_public))
                         from public.profile_contact_channels where profile_id = v_profile), '[]'::jsonb),
    'education', coalesce((select jsonb_agg(to_jsonb(e) - 'institution_id' - 'profile_id')
                  from public.alumni_education e where e.profile_id = v_profile), '[]'::jsonb),
    'experience', coalesce((select jsonb_agg(to_jsonb(x) - 'institution_id' - 'profile_id')
                   from public.alumni_experience x where x.profile_id = v_profile), '[]'::jsonb),
    'offers', coalesce((select jsonb_agg(o.key) from public.profile_offers po
               join public.offer_types o on o.id = po.offer_type_id where po.profile_id = v_profile), '[]'::jsonb),
    'consents', coalesce((select jsonb_agg(jsonb_build_object('document', document, 'version', version,
                   'accepted_at', accepted_at, 'withdrawn_at', withdrawn_at))
                 from public.consents where institution_id = p_inst and user_id = auth.uid()), '[]'::jsonb),
    'contacts_initiated', coalesce((select jsonb_agg(jsonb_build_object('recipient_profile_id', recipient_profile_id,
                   'channel', channel, 'at', created_at))
                 from public.contact_events where institution_id = p_inst and initiator_user_id = auth.uid()), '[]'::jsonb),
    'access_requests', coalesce((select jsonb_agg(to_jsonb(r) - 'institution_id' - 'user_id' - 'decided_by')
                 from public.access_requests r where r.institution_id = p_inst and r.user_id = auth.uid()), '[]'::jsonb)
  ) into v_data;
  if v_profile is null and v_data -> 'access_requests' = '[]'::jsonb then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  perform public.log_audit(p_inst, 'profile.data_exported', 'alumni_profile', v_profile::text);
  return v_data;
end $$;

revoke all on function public.normalize_student_id(text), public.request_access(uuid, text, text, text, int, text, text),
  public.access_request_matches(uuid[]) from public, anon, authenticated;
grant execute on function public.request_access(uuid, text, text, text, int, text, text),
  public.access_request_matches(uuid[]) to authenticated;
