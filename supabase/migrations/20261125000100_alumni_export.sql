-- Alumni CSV export (EXP-01, first cut): a school admin downloads the roster's current results as a CSV file.
-- 1. roster_matches holds the roster's filters (text, status, class range) in one place. admin_roster and
--    admin_export_alumni both read through it, so an export always has exactly the rows the roster shows.
-- 2. admin_export_alumni needs records.export, which only school admins hold (ADR 0005): reviewers are refused by
--    the database, not only by the page. It returns every matching row (no pagination) and writes one audit row
--    with the filters and the row count.
-- Not yet: XLSX, the private bucket with signed links (EXP-02) and per-school column sets (EXP-03). The file is
-- built by the app and streamed straight to the admin; nothing is stored.

create function public.roster_matches(p_inst uuid, p_query text, p_state text, p_class_min int, p_class_max int)
returns table(profile_id uuid, roster_state text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_state is not null and p_state not in ('published', 'hidden', 'onboarding', 'suspended', 'archived', 'deceased') then
    raise exception 'invalid roster state' using errcode = '22023';
  end if;
  if p_class_min > p_class_max or length(p_query) > 200 then
    raise exception 'invalid roster filters' using errcode = '22023';
  end if;
  return query
  with records as (
    select p.id, case when p.status <> 'active' then p.status::text
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
  select r.id, r.roster_state from records r where p_state is null or r.roster_state = p_state;
end $$;

create or replace function public.admin_roster(p_inst uuid, p_query text default null, p_state text default null,
  p_class_min int default null, p_class_max int default null, p_limit int default 25, p_offset int default 0)
returns table(id uuid, first_name text, last_name text, preferred_name text, grad_year int, city text, country text,
  job_title text, employer text, state text, last_confirmed_at timestamptz, total_count bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.assert_permission(p_inst, 'records.read');
  if p_limit is null or p_limit not between 1 and 100 or p_offset is null or p_offset < 0 then
    raise exception 'invalid roster filters' using errcode = '22023';
  end if;
  return query
  select p.id, p.first_name, p.last_name, p.preferred_name, p.grad_year, p.city, p.country, p.job_title, p.employer,
    m.roster_state, p.last_confirmed_at, count(*) over ()
  from public.roster_matches(p_inst, p_query, p_state, p_class_min, p_class_max) m
  join public.alumni_profiles p on p.id = m.profile_id
  order by lower(p.last_name), lower(p.first_name), p.id limit p_limit offset p_offset;
end $$;

create function public.admin_export_alumni(p_inst uuid, p_query text default null, p_state text default null,
  p_class_min int default null, p_class_max int default null)
returns table(id uuid, first_name text, last_name text, preferred_name text, maiden_name text, school_student_id text,
  grad_year int, email text, job_title text, employer text, career_field_en text, career_field_fr text,
  city text, country text, state text, last_confirmed_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare v_rows int;
begin
  perform public.assert_permission(p_inst, 'records.export');
  return query
  select p.id, p.first_name, p.last_name, p.preferred_name, pr.maiden_name, pr.school_student_id, p.grad_year,
    u.email::text, p.job_title, p.employer,
    coalesce(cf.label_en, p.career_field_other), coalesce(cf.label_fr, p.career_field_other),
    p.city, p.country, m.roster_state, p.last_confirmed_at
  from public.roster_matches(p_inst, p_query, p_state, p_class_min, p_class_max) m
  join public.alumni_profiles p on p.id = m.profile_id
  left join public.alumni_private pr on pr.profile_id = p.id and pr.institution_id = p_inst
  left join auth.users u on u.id = p.user_id
  left join public.career_fields cf on cf.id = p.career_field_id
  order by lower(p.last_name), lower(p.first_name), p.id;
  get diagnostics v_rows = row_count;
  perform public.log_audit(p_inst, 'export.alumni', 'institution', p_inst::text, jsonb_build_object(
    'format', 'csv', 'rows', v_rows,
    'filters', jsonb_strip_nulls(jsonb_build_object('query', nullif(trim(p_query), ''), 'state', p_state,
      'class_min', p_class_min, 'class_max', p_class_max))));
end $$;

revoke all on function public.roster_matches(uuid, text, text, int, int) from public, anon, authenticated;
revoke all on function public.admin_export_alumni(uuid, text, text, int, int) from public, anon;
grant execute on function public.admin_export_alumni(uuid, text, text, int, int) to authenticated;
