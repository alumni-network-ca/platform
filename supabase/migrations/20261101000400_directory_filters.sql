-- Directory and profile pages (DIR-02, DIR-03, CON-02; design Directory and Profile in docs/design/alumni-full-flow).
-- 1. search_directory, as 20261101000100 left it (with p_sort), also takes the filters the design draws: the
--    university in the free-text search, a class range (decades) and several "Open to" options that must all
--    match. Same signature and columns, so callers and generated types are unchanged.
-- 2. directory_facets lists the cities, universities and decades present in the directory, for the filters.
-- 3. profile_contact_types says which contact channels a published profile shows, never their values, so the
--    profile page knows which "Show" buttons to draw. Values are still revealed one at a time by initiate_contact.

create or replace function public.search_directory(
  p_inst uuid, p_filters jsonb default '{}'::jsonb, p_limit int default 24, p_offset int default 0,
  p_sort text default 'name'
) returns table (
  id uuid, first_name text, last_name text, preferred_name text, grad_year int, city text, country text,
  job_title text, employer text, career_field_key text, career_field_en text, career_field_fr text,
  schools text[], offers text[], published_at timestamptz, total_count bigint
)
language sql volatile security invoker set search_path = '' as $$
  select
    p.id, p.first_name, p.last_name, p.preferred_name, p.grad_year, p.city, p.country, p.job_title, p.employer,
    c.key, c.label_en, c.label_fr,
    array(select e.school from public.alumni_education e where e.profile_id = p.id order by e.sort_order),
    array(select o.key from public.profile_offers po join public.offer_types o on o.id = po.offer_type_id
          where po.profile_id = p.id order by o.sort_order),
    p.published_at,
    count(*) over ()
  from public.alumni_profiles p
  left join public.career_fields c on c.id = p.career_field_id
  where p.institution_id = p_inst and p.status = 'active' and p.visibility = 'members'
    and public.has_permission(p_inst, 'directory.use')
    and (coalesce(trim(p_filters ->> 'q'), '') = '' or strpos(
          lower(p.first_name || ' ' || p.last_name || ' ' || coalesce(p.preferred_name, '') || ' '
                || coalesce(p.job_title, '') || ' ' || coalesce(p.employer, '')),
          lower(trim(p_filters ->> 'q'))) > 0
        or exists (select 1 from public.alumni_education e
                   where e.profile_id = p.id and strpos(lower(e.school), lower(trim(p_filters ->> 'q'))) > 0))
    and (p_filters ->> 'grad_year' is null or p.grad_year = (p_filters ->> 'grad_year')::int)
    and (p_filters ->> 'class_from' is null or p.grad_year >= (p_filters ->> 'class_from')::int)
    and (p_filters ->> 'class_to' is null or p.grad_year <= (p_filters ->> 'class_to')::int)
    and (p_filters ->> 'career_field' is null or c.key = p_filters ->> 'career_field')
    and (p_filters ->> 'city' is null or lower(p.city) = lower(p_filters ->> 'city'))
    and (p_filters ->> 'language' is null or (p_filters ->> 'language') = any (p.languages))
    and (p_filters ->> 'offer' is null or exists (
          select 1 from public.profile_offers po join public.offer_types o on o.id = po.offer_type_id
          where po.profile_id = p.id and o.key = p_filters ->> 'offer'))
    -- Every option asked for must be offered.
    and (jsonb_typeof(p_filters -> 'offers') is distinct from 'array' or not exists (
          select 1 from jsonb_array_elements_text(p_filters -> 'offers') wanted(key)
          where not exists (
            select 1 from public.profile_offers po join public.offer_types o on o.id = po.offer_type_id
            where po.profile_id = p.id and o.key = wanted.key)))
    and (p_filters ->> 'school' is null or exists (
          select 1 from public.alumni_education e
          where e.profile_id = p.id and lower(e.school) = lower(p_filters ->> 'school')))
  order by
    case when p_sort = 'random' then random() end,
    case when p_sort = 'recent' then p.published_at end desc nulls last,
    p.last_name, p.first_name, p.id
  limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0);
$$;

-- What the directory's filters can offer: published profiles at this school only, as counts.
create function public.directory_facets(p_inst uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_out jsonb;
begin
  if not public.has_permission(p_inst, 'directory.use') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  with listed as (
    select id, city, grad_year from public.alumni_profiles
    where institution_id = p_inst and status = 'active' and visibility = 'members'
  )
  select jsonb_build_object(
    'total', (select count(*) from listed),
    'cities', coalesce((
      select jsonb_agg(jsonb_build_object('value', city, 'count', n) order by n desc, city)
      from (select min(trim(city)) as city, count(*) as n from listed
            where coalesce(trim(city), '') <> '' group by lower(trim(city))) c), '[]'::jsonb),
    'schools', coalesce((
      select jsonb_agg(jsonb_build_object('value', school, 'count', n) order by n desc, school)
      from (select min(trim(e.school)) as school, count(distinct e.profile_id) as n
            from public.alumni_education e join listed l on l.id = e.profile_id
            group by lower(trim(e.school))) s), '[]'::jsonb),
    'decades', coalesce((
      select jsonb_agg(jsonb_build_object('value', decade, 'count', n) order by decade desc)
      from (select (grad_year / 10) * 10 as decade, count(*) as n from listed group by 1) d), '[]'::jsonb)
  ) into v_out;
  return v_out;
end $$;

-- Which channels a published profile shows, by type only. Email and phone values stay behind initiate_contact.
create function public.profile_contact_types(p_profile uuid) returns public.channel_type[]
language plpgsql stable security definer set search_path = '' as $$
declare
  v_inst uuid;
begin
  select institution_id into v_inst from public.alumni_profiles
  where id = p_profile and status = 'active' and visibility = 'members';
  if v_inst is null or not public.has_permission(v_inst, 'directory.use') then
    raise exception 'not available' using errcode = '42501';
  end if;
  return array(
    select type from public.profile_contact_channels
    where profile_id = p_profile and is_public order by sort_order, type
  );
end $$;

revoke execute on function public.directory_facets(uuid), public.profile_contact_types(uuid) from public, anon;
grant execute on function public.directory_facets(uuid), public.profile_contact_types(uuid) to authenticated;
