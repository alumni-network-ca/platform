-- Roles have a month as well as a year ("Mar 2019 – now"), as the profile editor asks for them. Months are
-- optional, need their year, and are 1 to 12. save_my_profile stores them; everything else in it is unchanged.
alter table public.alumni_experience
  add column start_month smallint check (start_month between 1 and 12),
  add column end_month smallint check (end_month between 1 and 12),
  add check (start_month is null or start_year is not null),
  add check (end_month is null or end_year is not null);

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
