-- The alumni home page (DIR-06) shows a few classmates, a different few on each visit, and the members who
-- published most recently. search_directory gains a sort (name, recent or random) and returns published_at;
-- what it may return is unchanged: active, members-visible profiles at a school the caller may search.
drop function public.search_directory(uuid, jsonb, int, int);

-- Security invoker: runs under the caller's RLS, so it can only ever see what the caller may see.
-- p_filters keys (all optional): q, grad_year, career_field (key), offer (key), city, school, language.
-- p_sort: 'name' (the default), 'recent' (latest published first) or 'random'; anything else sorts by name.
-- Volatile because of the random sort.
create function public.search_directory(
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
    and (coalesce(p_filters ->> 'q', '') = '' or strpos(
          lower(p.first_name || ' ' || p.last_name || ' ' || coalesce(p.preferred_name, '') || ' '
                || coalesce(p.job_title, '') || ' ' || coalesce(p.employer, '')),
          lower(trim(p_filters ->> 'q'))) > 0)
    and (p_filters ->> 'grad_year' is null or p.grad_year = (p_filters ->> 'grad_year')::int)
    and (p_filters ->> 'career_field' is null or c.key = p_filters ->> 'career_field')
    and (p_filters ->> 'city' is null or lower(p.city) = lower(p_filters ->> 'city'))
    and (p_filters ->> 'language' is null or (p_filters ->> 'language') = any (p.languages))
    and (p_filters ->> 'offer' is null or exists (
          select 1 from public.profile_offers po join public.offer_types o on o.id = po.offer_type_id
          where po.profile_id = p.id and o.key = p_filters ->> 'offer'))
    and (p_filters ->> 'school' is null or exists (
          select 1 from public.alumni_education e
          where e.profile_id = p.id and lower(e.school) = lower(p_filters ->> 'school')))
  order by
    case when p_sort = 'random' then random() end,
    case when p_sort = 'recent' then p.published_at end desc nulls last,
    p.last_name, p.first_name, p.id
  limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0);
$$;

revoke all on function public.search_directory(uuid, jsonb, int, int, text) from public, anon;
grant execute on function public.search_directory(uuid, jsonb, int, int, text) to authenticated;
