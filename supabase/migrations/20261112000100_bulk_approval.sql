-- ONB-08: school admins approve many access requests at once. At launch the school emails every alumnus the
-- /join link, so the pending queue fills with hundreds of requests. Each request still goes through the one
-- approve path (decide_access_request): its own profile, membership, approval email and audit row.
-- Anything that needs a human look is skipped, never approved: a possible match, an existing profile, a request
-- that is no longer pending, or one from another school.

-- 1. A school-admin-only permission. Reviewers keep deciding one by one.
insert into public.role_permissions (role, permission) values ('school_admin', 'requests.bulkapprove');

-- 2. The matching rules live in one internal helper, so the queue's suggestions and the bulk skip agree.
--    No permission check here: callers check first. Clients can't call it.
create function public.access_request_match_rows(p_requests uuid[])
returns table(request_id uuid, profile_id uuid, first_name text, last_name text, grad_year int, claimed boolean, score real,
  id_match boolean, school_student_id text)
language sql stable security definer set search_path = '' as $$
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
  order by d.request_id, d.id_match desc, d.score desc, d.profile_id
$$;

-- Same guards and the same rows as before (20261105000100); the query moved into the helper above.
create or replace function public.access_request_matches(p_requests uuid[])
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
  return query select * from public.access_request_match_rows(p_requests);
end $$;

-- 3. Approve up to 200 requests. Each one is decided on its own and the result says, per request, approved or
--    skipped with a reason: not_allowed (unknown, or another school: the same answer, so nothing is revealed),
--    not_pending, has_profile, possible_match, or failed (the approval itself raised; nothing of it was kept).
--    A retry finds the approved ones no longer pending, so nobody gets a second approval email.
create function public.approve_access_requests(p_requests uuid[])
returns table(request_id uuid, outcome text, reason text, profile_id uuid)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_permitted uuid[];
  v_ids uuid[];
  v_matched uuid[];
  v_id uuid;
  r public.access_requests;
  v_reason text;
  v_profile uuid;
  v_seen jsonb := '[]'::jsonb;
  v_batch record;
begin
  select coalesce(array_agg(i), '{}') into v_permitted from public.permitted_institutions('requests.bulkapprove') i;
  if auth.uid() is null or cardinality(v_permitted) = 0 then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if cardinality(p_requests) > 200 then
    raise exception 'too many requests' using errcode = '22023';
  end if;

  -- Each id once, in the order given.
  select coalesce(array_agg(u.id order by u.ord), '{}') into v_ids
  from (select distinct on (x.id) x.id, x.ord from unnest(p_requests) with ordinality x(id, ord)
        where x.id is not null order by x.id, x.ord) u;
  select coalesce(array_agg(distinct m.request_id), '{}') into v_matched
  from public.access_request_match_rows(v_ids) m;

  foreach v_id in array v_ids loop
    v_reason := null;
    v_profile := null;
    select * into r from public.access_requests a where a.id = v_id for update;
    if not found or not (r.institution_id = any(v_permitted)) then
      v_reason := 'not_allowed';
    elsif r.status <> 'pending' then
      v_reason := 'not_pending';
    elsif exists (select 1 from public.alumni_profiles p where p.institution_id = r.institution_id and p.user_id = r.user_id) then
      v_reason := 'has_profile';
    elsif v_id = any(v_matched) then
      v_reason := 'possible_match';
    else
      -- The block is a savepoint: if this approval raises, only its own writes are undone and the batch goes on.
      begin
        v_profile := public.decide_access_request(v_id, 'approve');
      exception when sqlstate '23505' or sqlstate '22023' or sqlstate '42501' then
        v_reason := 'failed';
      end;
    end if;

    if v_reason is distinct from 'not_allowed' then
      v_seen := v_seen || jsonb_build_object('inst', r.institution_id, 'ok', v_reason is null);
    end if;
    request_id := v_id;
    outcome := case when v_reason is null then 'approved' else 'skipped' end;
    reason := v_reason;
    profile_id := v_profile;
    return next;
  end loop;

  -- One audit row per batch and school, on top of each approval's own row. Counts only.
  for v_batch in
    select (e ->> 'inst')::uuid as inst, count(*) as requested, count(*) filter (where (e ->> 'ok')::boolean) as approved
    from jsonb_array_elements(v_seen) e group by 1
  loop
    perform public.log_audit(v_batch.inst, 'access_request.bulk_approve', 'access_request_batch', null,
      jsonb_build_object('requested', v_batch.requested, 'approved', v_batch.approved,
        'skipped', v_batch.requested - v_batch.approved));
  end loop;
end $$;

revoke all on function public.access_request_match_rows(uuid[]), public.approve_access_requests(uuid[])
  from public, anon, authenticated;
grant execute on function public.approve_access_requests(uuid[]) to authenticated;
