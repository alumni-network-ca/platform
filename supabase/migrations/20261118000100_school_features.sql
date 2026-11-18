-- School features (SA-07, PRF-08, ADR 0021): parts of the product a platform admin switches on for one school only.
-- The first one is "Yeshiva / Seminary": alumni of a Jewish high school list where they studied after graduating.
-- 1. institutions.features holds the switches, as {"yeshiva_seminary": true}. Only platform_set_school_features
--    writes it, and it keeps known keys only. update_school_settings never reads it, so school admins cannot change it.
-- 2. school_config hands the switches to the app with the rest of the cached config.
-- 3. alumni_yeshiva holds the rows. They are read like education rows, but only at schools with the feature on:
--    switching it off hides them everywhere, switching it back on shows them again. save_my_profile refuses them at
--    a school without the feature. export_my_data always includes them: they are the alumnus's data.
-- 4. The directory's free-text search also matches yeshiva names, and a new "yeshiva" filter and facet list them.

alter table public.institutions
  add column features jsonb not null default '{}'::jsonb check (jsonb_typeof(features) = 'object');

-- The schools with a feature on. A set, so read policies test it once per statement (see 20261028000200).
create function public.feature_institutions(p_key text) returns setof uuid
language sql stable security definer set search_path = '' rows 5 as $$
  select id from public.institutions where coalesce((features ->> p_key)::boolean, false);
$$;

create function public.school_has_feature(p_inst uuid, p_key text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.institutions
                 where id = p_inst and coalesce((features ->> p_key)::boolean, false));
$$;

-- Known keys only, each a boolean; anything else is dropped.
create function public.platform_set_school_features(p_inst uuid, p_features jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_out jsonb := '{}'::jsonb;
  v_key text;
begin
  if not public.is_system_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_features is null or jsonb_typeof(p_features) <> 'object' then
    raise exception 'features must be an object' using errcode = '22023';
  end if;
  foreach v_key in array array['yeshiva_seminary'] loop
    if jsonb_typeof(p_features -> v_key) = 'boolean' then
      v_out := v_out || jsonb_build_object(v_key, (p_features ->> v_key)::boolean);
    end if;
  end loop;
  update public.institutions set features = v_out where id = p_inst;
  if not found then
    raise exception 'unknown school' using errcode = '22023';
  end if;
  perform public.log_audit(p_inst, 'school.features_updated', 'institution', p_inst::text,
    jsonb_build_object('features', v_out));
  return v_out;
end $$;

create or replace function public.school_config(p_inst uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'branding', i.branding,
    'features', i.features,
    -- Platform rows and this school's own, inactive ones included: profiles still show a retired option's label.
    'career_fields', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'key', c.key, 'label_en', c.label_en, 'label_fr', c.label_fr,
               'institution_id', c.institution_id, 'is_active', c.is_active, 'sort_order', c.sort_order)
             order by c.sort_order, c.key)
      from public.career_fields c where c.institution_id is null or c.institution_id = i.id), '[]'::jsonb),
    'offer_types', coalesce((
      select jsonb_agg(jsonb_build_object('id', o.id, 'key', o.key, 'label_en', o.label_en, 'label_fr', o.label_fr,
               'institution_id', o.institution_id, 'is_active', o.is_active, 'sort_order', o.sort_order)
             order by o.sort_order, o.key)
      from public.offer_types o where o.institution_id is null or o.institution_id = i.id), '[]'::jsonb),
    'role_permissions', coalesce((
      select jsonb_object_agg(r.role, r.permissions)
      from (select role, jsonb_agg(permission order by permission) as permissions
            from public.role_permissions group by role) r), '{}'::jsonb)
  )
  from public.institutions i where i.id = p_inst and i.status = 'active';
$$;

create table public.alumni_yeshiva (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null,
  institution_id uuid not null,
  name text not null check (length(trim(name)) between 1 and 120),
  location text check (length(location) <= 120),
  start_year int check (start_year between 1900 and 2100),
  end_year int check (end_year between 1900 and 2100),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  foreign key (profile_id, institution_id) references public.alumni_profiles (id, institution_id) on delete cascade,
  check (end_year is null or start_year is null or end_year >= start_year)
);
create index alumni_yeshiva_profile_idx on public.alumni_yeshiva (profile_id, sort_order);
create index alumni_yeshiva_name_idx on public.alumni_yeshiva (institution_id, lower(name));

alter table public.alumni_yeshiva enable row level security;
-- Read like education rows, and only while the school has the feature.
create policy yeshiva_read on public.alumni_yeshiva for select to authenticated
  using (
    institution_id in (select public.feature_institutions('yeshiva_seminary'))
    and (
      profile_id in (select public.my_profile_ids())
      or institution_id in (select public.permitted_institutions('records.read'))
      or profile_id in (select public.directory_profile_ids())
    )
  );
grant select on public.alumni_yeshiva to authenticated;

-- As 20261101000300 left it, plus the 'yeshiva' list.
create or replace function public.save_my_profile(p_inst uuid, p_payload jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_profile uuid;
  v_was_complete timestamptz;
  v_now_complete timestamptz;
  p jsonb := p_payload -> 'profile';
begin
  select id, onboarding_completed_at into v_profile, v_was_complete
  from public.alumni_profiles
  where institution_id = p_inst and user_id = auth.uid() and status = 'active'
  for update;
  if v_profile is null then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  if p is not null then
    if p ? 'career_field_id' and not public.career_field_allowed(nullif(p ->> 'career_field_id', '')::uuid, p_inst) then
      raise exception 'unknown career field' using errcode = '22023';
    end if;
    update public.alumni_profiles set
      first_name = case when p ? 'first_name' then trim(p ->> 'first_name') else first_name end,
      last_name = case when p ? 'last_name' then trim(p ->> 'last_name') else last_name end,
      preferred_name = case when p ? 'preferred_name' then nullif(trim(p ->> 'preferred_name'), '') else preferred_name end,
      grad_year = case when p ? 'grad_year' then (p ->> 'grad_year')::int else grad_year end,
      city = case when p ? 'city' then nullif(trim(p ->> 'city'), '') else city end,
      country = case when p ? 'country' then nullif(trim(p ->> 'country'), '') else country end,
      bio = case when p ? 'bio' then nullif(trim(p ->> 'bio'), '') else bio end,
      job_title = case when p ? 'job_title' then nullif(trim(p ->> 'job_title'), '') else job_title end,
      employer = case when p ? 'employer' then nullif(trim(p ->> 'employer'), '') else employer end,
      career_field_id = case when p ? 'career_field_id' then nullif(p ->> 'career_field_id', '')::uuid else career_field_id end,
      career_field_other = case when p ? 'career_field_other' then nullif(trim(p ->> 'career_field_other'), '') else career_field_other end,
      languages = case when p ? 'languages'
        then coalesce(array(select trim(x) from jsonb_array_elements_text(p -> 'languages') x where trim(x) <> ''), '{}')
        else languages end,
      onboarding_step = case when p ? 'onboarding_step' then (p ->> 'onboarding_step')::int else onboarding_step end,
      onboarding_completed_at = case when coalesce((p ->> 'onboarding_completed')::boolean, false)
        then coalesce(onboarding_completed_at, now()) else onboarding_completed_at end
    where id = v_profile
    returning onboarding_completed_at into v_now_complete;
  else
    v_now_complete := v_was_complete;
  end if;

  if p_payload ? 'private' then
    insert into public.alumni_private (profile_id, institution_id, maiden_name)
    values (v_profile, p_inst, nullif(trim(p_payload -> 'private' ->> 'maiden_name'), ''))
    on conflict (profile_id) do update set maiden_name = excluded.maiden_name;
  end if;

  if p_payload ? 'channels' then
    delete from public.profile_contact_channels where profile_id = v_profile;
    insert into public.profile_contact_channels (profile_id, institution_id, type, value, is_public, sort_order)
    select v_profile, p_inst, (c ->> 'type')::public.channel_type, trim(c ->> 'value'),
           coalesce((c ->> 'is_public')::boolean, false), n::int
    from jsonb_array_elements(p_payload -> 'channels') with ordinality as t(c, n);
  end if;

  if p_payload ? 'education' then
    delete from public.alumni_education where profile_id = v_profile;
    insert into public.alumni_education (profile_id, institution_id, school, degree, field_of_study, graduation_year, sort_order)
    select v_profile, p_inst, trim(e ->> 'school'), nullif(trim(e ->> 'degree'), ''),
           nullif(trim(e ->> 'field_of_study'), ''), (e ->> 'graduation_year')::int, n::int
    from jsonb_array_elements(p_payload -> 'education') with ordinality as t(e, n);
  end if;

  if p_payload ? 'experience' then
    if exists (
      select 1 from jsonb_array_elements(p_payload -> 'experience') x
      where not public.career_field_allowed(nullif(x ->> 'career_field_id', '')::uuid, p_inst)
    ) then
      raise exception 'unknown career field' using errcode = '22023';
    end if;
    delete from public.alumni_experience where profile_id = v_profile;
    insert into public.alumni_experience (profile_id, institution_id, job_title, employer, career_field_id, location,
                                          start_year, start_month, end_year, end_month, is_current, sort_order)
    select v_profile, p_inst, trim(x ->> 'job_title'), nullif(trim(x ->> 'employer'), ''),
           nullif(x ->> 'career_field_id', '')::uuid, nullif(trim(x ->> 'location'), ''),
           (x ->> 'start_year')::int, (x ->> 'start_month')::smallint,
           (x ->> 'end_year')::int, (x ->> 'end_month')::smallint,
           coalesce((x ->> 'is_current')::boolean, false), n::int
    from jsonb_array_elements(p_payload -> 'experience') with ordinality as t(x, n);
  end if;

  if p_payload ? 'yeshiva' then
    if not public.school_has_feature(p_inst, 'yeshiva_seminary') then
      raise exception 'this school does not list yeshivas' using errcode = '42501';
    end if;
    delete from public.alumni_yeshiva where profile_id = v_profile;
    insert into public.alumni_yeshiva (profile_id, institution_id, name, location, start_year, end_year, sort_order)
    select v_profile, p_inst, trim(y ->> 'name'), nullif(trim(y ->> 'location'), ''),
           (y ->> 'start_year')::int, (y ->> 'end_year')::int, n::int
    from jsonb_array_elements(p_payload -> 'yeshiva') with ordinality as t(y, n);
  end if;

  if p_payload ? 'offers' then
    delete from public.profile_offers where profile_id = v_profile;
    insert into public.profile_offers (profile_id, offer_type_id, institution_id)
    select distinct on (o.key) v_profile, o.id, p_inst
    from public.offer_types o
    where o.is_active and (o.institution_id is null or o.institution_id = p_inst)
      and o.key in (select jsonb_array_elements_text(p_payload -> 'offers'))
    order by o.key, o.institution_id nulls last;
  end if;

  -- Any save by the alumnus counts as a confirmation once onboarding is done (DEC-06).
  if v_now_complete is not null then
    perform public.record_confirmation(
      v_profile, case when v_was_complete is null then 'onboarding' else 'alumnus_save' end::public.confirmation_source);
  end if;

  perform public.log_audit(p_inst, 'profile.saved', 'alumni_profile', v_profile::text,
    jsonb_build_object('sections', (select jsonb_agg(k) from jsonb_object_keys(p_payload) k)));
  return v_profile;
end $$;

-- As 20261105000100 left it, plus the yeshiva rows.
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
    'yeshiva', coalesce((select jsonb_agg(to_jsonb(y) - 'institution_id' - 'profile_id' order by y.sort_order)
                from public.alumni_yeshiva y where y.profile_id = v_profile), '[]'::jsonb),
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

-- As 20261101000400 left it, plus yeshiva names in the free-text search and a 'yeshiva' filter. Runs under the
-- caller's RLS, so yeshiva rows only count at a school with the feature on. Same signature and columns.
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
                   where e.profile_id = p.id and strpos(lower(e.school), lower(trim(p_filters ->> 'q'))) > 0)
        or exists (select 1 from public.alumni_yeshiva y
                   where y.profile_id = p.id and strpos(lower(y.name), lower(trim(p_filters ->> 'q'))) > 0))
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
    and (p_filters ->> 'yeshiva' is null or exists (
          select 1 from public.alumni_yeshiva y
          where y.profile_id = p.id and lower(trim(y.name)) = lower(trim(p_filters ->> 'yeshiva'))))
  order by
    case when p_sort = 'random' then random() end,
    case when p_sort = 'recent' then p.published_at end desc nulls last,
    p.last_name, p.first_name, p.id
  limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0);
$$;

-- As 20261101000400 left it, plus 'yeshivas' at a school with the feature on (an empty list elsewhere).
create or replace function public.directory_facets(p_inst uuid) returns jsonb
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
    'yeshivas', coalesce((
      select jsonb_agg(jsonb_build_object('value', name, 'count', n) order by n desc, name)
      from (select min(trim(y.name)) as name, count(distinct y.profile_id) as n
            from public.alumni_yeshiva y join listed l on l.id = y.profile_id
            where public.school_has_feature(p_inst, 'yeshiva_seminary')
            group by lower(trim(y.name))) s), '[]'::jsonb),
    'decades', coalesce((
      select jsonb_agg(jsonb_build_object('value', decade, 'count', n) order by decade desc)
      from (select (grad_year / 10) * 10 as decade, count(*) as n from listed group by 1) d), '[]'::jsonb)
  ) into v_out;
  return v_out;
end $$;

revoke execute on function public.feature_institutions(text), public.school_has_feature(uuid, text),
  public.platform_set_school_features(uuid, jsonb) from public, anon;
-- The read policy calls feature_institutions with the caller's privileges. Which schools have a feature is not
-- secret: school_config is public.
grant execute on function public.feature_institutions(text), public.platform_set_school_features(uuid, jsonb)
  to authenticated;
revoke execute on function public.school_has_feature(uuid, text) from authenticated;
