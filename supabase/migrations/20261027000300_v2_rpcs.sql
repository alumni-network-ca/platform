-- v2 baseline, part 3 of 3: every write path (RPCs) and the internal helpers they share.
-- Rules for each RPC (docs/architecture/data-model.md §6):
--   * security definer with an empty search_path, so every name is schema-qualified;
--   * the permission check comes first;
--   * privileged changes write audit_log;
--   * execute is granted explicitly at the end of this file; everything else stays revoked.

-- Internal helpers (not executable by clients) ---------------------------------------------------------

create function public.log_audit(
  p_inst uuid, p_action text, p_target_type text, p_target_id text, p_metadata jsonb default '{}'::jsonb
) returns void
language sql security definer set search_path = '' as $$
  insert into public.audit_log (institution_id, actor_user_id, actor_kind, action, target_type, target_id, metadata)
  values (
    p_inst, auth.uid(),
    case
      when auth.uid() is null then 'system'
      when public.is_system_admin() and (p_inst is null or not public.is_member(p_inst)) then 'system_admin'
      else 'member'
    end,
    p_action, p_target_type, p_target_id, coalesce(p_metadata, '{}'::jsonb)
  );
$$;

-- Fixed-window counter. Returns false once p_max hits are exceeded in the current window.
create function public.hit_rate_limit(p_key text, p_max int, p_window interval) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_seconds double precision := extract(epoch from p_window);
  v_start timestamptz := to_timestamp(floor(extract(epoch from now()) / v_seconds) * v_seconds);
  v_count int;
begin
  insert into public.rate_limit_counters (key, window_start, count) values (p_key, v_start, 1)
  on conflict (key, window_start) do update set count = public.rate_limit_counters.count + 1
  returning count into v_count;
  return v_count <= p_max;
end $$;

create function public.hash_token(p_token text) returns text
language sql immutable set search_path = '' as $$
  select encode(extensions.digest(p_token, 'sha256'), 'hex');
$$;

-- The language an email goes out in: the school's approved template in the recipient's language, else in
-- the other approved language, else nothing (null). Staff invitations fall back to the platform default,
-- because a brand-new school has no approved templates when its first admin is invited.
create function public.resolve_email_template(p_inst uuid, p_key public.email_template_key, p_locale public.locale)
returns public.locale
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select locale from public.email_templates
      where institution_id = p_inst and key = p_key and status = 'approved' and locale = p_locale),
    (select locale from public.email_templates
      where institution_id = p_inst and key = p_key and status = 'approved' order by locale limit 1),
    case when p_key = 'staff_invitation' then p_locale end
  );
$$;

create function public.enqueue_email(
  p_inst uuid, p_key public.email_template_key, p_to_user uuid, p_to_email text, p_subject_id uuid
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(trim(p_to_email));
  v_locale public.locale;
  v_used public.locale;
  v_status public.email_status := 'queued';
  v_id uuid;
begin
  v_locale := coalesce(
    (select locale from public.user_preferences where user_id = p_to_user),
    (select default_locale from public.institutions where id = p_inst),
    'en'
  );
  v_used := public.resolve_email_template(p_inst, p_key, v_locale);
  if exists (select 1 from public.email_suppressions where email = v_email) then
    v_status := 'suppressed';
  elsif v_used is null then
    v_status := 'skipped_no_template';
  end if;
  insert into public.email_outbox (institution_id, template_key, locale, to_email, to_user_id, subject_id, status)
  values (p_inst, p_key::text, coalesce(v_used, v_locale), v_email, p_to_user, p_subject_id, v_status)
  returning id into v_id;
  return v_id;
end $$;

-- Records an alumnus confirmation (DEC-06): restarts the 12-month clock and closes any open request.
create function public.record_confirmation(p_profile uuid, p_source public.confirmation_source) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_inst uuid;
  v_months int;
begin
  select p.institution_id, i.confirmation_interval_months into v_inst, v_months
  from public.alumni_profiles p join public.institutions i on i.id = p.institution_id
  where p.id = p_profile;

  update public.alumni_profiles
  set last_confirmed_at = now(), confirmation_due_at = now() + make_interval(months => v_months)
  where id = p_profile;

  update public.confirmation_requests
  set status = case when p_source = 'alumnus_still_accurate' then 'confirmed' else 'superseded' end,
      confirmed_at = case when p_source = 'alumnus_still_accurate' then now() end
  where profile_id = p_profile and status = 'open';

  insert into public.profile_confirmations (institution_id, profile_id, source, actor_user_id)
  values (v_inst, p_profile, p_source, auth.uid());
end $$;

create function public.career_field_allowed(p_field uuid, p_inst uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_field is null or exists (
    select 1 from public.career_fields
    where id = p_field and is_active and (institution_id is null or institution_id = p_inst)
  );
$$;

create function public.assert_last_school_admin_kept(p_inst uuid, p_user uuid) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.institution_memberships
    where institution_id = p_inst and role = 'school_admin' and status = 'active' and user_id <> p_user
  ) then
    raise exception 'a school needs at least one school admin' using errcode = '22023';
  end if;
end $$;

create function public.create_staff_invitation(p_inst uuid, p_email text, p_role public.member_role) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(trim(p_email));
  v_id uuid;
begin
  if p_role not in ('school_admin', 'reviewer') then
    raise exception 'invalid staff role' using errcode = '22023';
  end if;
  update public.staff_invitations set revoked_at = now()
  where institution_id = p_inst and lower(email) = v_email and accepted_at is null and revoked_at is null;
  insert into public.staff_invitations (institution_id, email, role, invited_by)
  values (p_inst, v_email, p_role, auth.uid())
  returning id into v_id;
  perform public.enqueue_email(p_inst, 'staff_invitation', null, v_email, v_id);
  perform public.log_audit(p_inst, 'staff.invited', 'staff_invitation', v_id::text, jsonb_build_object('role', p_role));
  return v_id;
end $$;

create function public.validate_template_text(p_subject text, p_body text) returns void
language plpgsql immutable set search_path = '' as $$
declare
  v_name text;
begin
  if position('<' in p_subject) > 0 or position('<' in p_body) > 0 then
    raise exception 'templates are plain text: HTML is not allowed' using errcode = '22023';
  end if;
  for v_name in select (regexp_matches(p_subject || ' ' || p_body, '\{([^}]*)\}', 'g'))[1] loop
    if v_name not in ('first_name', 'school_name', 'sign_in_link', 'action_link', 'confirm_link', 'reason', 'message') then
      raise exception 'unknown placeholder {%}', v_name using errcode = '22023';
    end if;
  end loop;
end $$;

-- Public -----------------------------------------------------------------------------------------------

create function public.public_school(p_slug text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', id, 'name', name, 'slug', slug, 'default_locale', default_locale, 'branding', branding)
  from public.institutions where slug = lower(p_slug) and status = 'active';
$$;

-- Sign-up and approval (ADR 0004) ----------------------------------------------------------------------

create function public.request_access(
  p_inst uuid, p_first_name text, p_last_name text, p_maiden_name text, p_grad_year int, p_note text
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_confirmed timestamptz;
  v_id uuid;
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
  if not public.hit_rate_limit('request_access:' || v_uid, 10, interval '1 hour') then
    raise exception 'too many requests, try again later' using errcode = '54000';
  end if;
  -- Already has a profile here: succeed silently, so the response never reveals state (S4).
  if exists (select 1 from public.alumni_profiles where institution_id = p_inst and user_id = v_uid) then
    return;
  end if;

  update public.access_requests
  set first_name = trim(p_first_name), last_name = trim(p_last_name), maiden_name = nullif(trim(p_maiden_name), ''),
      grad_year = p_grad_year, note = nullif(trim(p_note), ''), email = v_email, status = 'pending'
  where institution_id = p_inst and user_id = v_uid and status in ('pending', 'needs_info')
  returning id into v_id;

  if v_id is null then
    insert into public.access_requests (institution_id, user_id, source, email, first_name, last_name, maiden_name, grad_year, note)
    values (p_inst, v_uid, 'signup', v_email, trim(p_first_name), trim(p_last_name),
            nullif(trim(p_maiden_name), ''), p_grad_year, nullif(trim(p_note), ''))
    returning id into v_id;
    perform public.log_audit(p_inst, 'access_request.created', 'access_request', v_id::text);
  end if;
end $$;

create function public.reply_to_info_request(p_request uuid, p_reply text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_inst uuid;
begin
  update public.access_requests set applicant_reply = trim(p_reply), status = 'pending'
  where id = p_request and user_id = auth.uid() and status = 'needs_info'
  returning institution_id into v_inst;
  if v_inst is null then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  perform public.log_audit(v_inst, 'access_request.replied', 'access_request', p_request::text);
end $$;

create function public.withdraw_access_request(p_request uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_inst uuid;
begin
  update public.access_requests set status = 'withdrawn'
  where id = p_request and user_id = auth.uid() and status in ('pending', 'needs_info')
  returning institution_id into v_inst;
  if v_inst is null then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  perform public.log_audit(v_inst, 'access_request.withdrawn', 'access_request', p_request::text);
end $$;

-- p_decision: approve | needs_info | reject. p_reason is the question (needs_info) or the reason (reject).
-- p_link_profile links an existing unclaimed record instead of creating one (kept for the CSV import).
create function public.decide_access_request(
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
    else
      if exists (select 1 from public.alumni_profiles where institution_id = r.institution_id and user_id = r.user_id) then
        raise exception 'this person already has a profile' using errcode = '23505';
      end if;
      insert into public.alumni_profiles (institution_id, user_id, first_name, last_name, grad_year)
      values (r.institution_id, r.user_id, r.first_name, r.last_name, r.grad_year)
      returning id into v_profile;
      insert into public.alumni_private (profile_id, institution_id, maiden_name)
      values (v_profile, r.institution_id, r.maiden_name);
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

-- Profile (owner) --------------------------------------------------------------------------------------

-- One transaction for every section of the profile (fixes F14). Each top-level key is optional; a present
-- list replaces the stored list. Shape:
--   { "profile":  { first_name, last_name, preferred_name, grad_year, city, country, bio, job_title, employer,
--                   career_field_id, career_field_other, languages: [], onboarding_step, onboarding_completed },
--     "private":  { maiden_name },
--     "channels": [ { type, value, is_public } ],
--     "education":  [ { school, degree, field_of_study, graduation_year } ],
--     "experience": [ { job_title, employer, career_field_id, location, start_year, end_year, is_current } ],
--     "offers":   [ "mentoring", ... ] }
create function public.save_my_profile(p_inst uuid, p_payload jsonb) returns uuid
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
                                          start_year, end_year, is_current, sort_order)
    select v_profile, p_inst, trim(x ->> 'job_title'), nullif(trim(x ->> 'employer'), ''),
           nullif(x ->> 'career_field_id', '')::uuid, nullif(trim(x ->> 'location'), ''),
           (x ->> 'start_year')::int, (x ->> 'end_year')::int, coalesce((x ->> 'is_current')::boolean, false), n::int
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

create function public.record_consent(p_inst uuid, p_document public.consent_document, p_version text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  -- Only people with a relationship to the school: a membership or their own access request.
  if auth.uid() is null or not (
    exists (select 1 from public.institution_memberships where institution_id = p_inst and user_id = auth.uid())
    or exists (select 1 from public.access_requests where institution_id = p_inst and user_id = auth.uid())
  ) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  insert into public.consents (institution_id, user_id, document, version) values (p_inst, auth.uid(), p_document, p_version);
  perform public.log_audit(p_inst, 'consent.accepted', 'consent', p_document::text, jsonb_build_object('version', p_version));
end $$;

create function public.withdraw_consent(p_inst uuid, p_document public.consent_document) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.consents set withdrawn_at = now()
  where institution_id = p_inst and user_id = auth.uid() and document = p_document and withdrawn_at is null;
  if p_document = 'directory_publication' then
    update public.alumni_profiles set visibility = 'hidden' where institution_id = p_inst and user_id = auth.uid();
  end if;
  perform public.log_audit(p_inst, 'consent.withdrawn', 'consent', p_document::text);
end $$;

create function public.set_my_visibility(p_inst uuid, p_visibility public.profile_visibility) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_profile public.alumni_profiles;
begin
  select * into v_profile from public.alumni_profiles
  where institution_id = p_inst and user_id = auth.uid() and status = 'active' for update;
  if not found then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_visibility = 'members' then
    if v_profile.onboarding_completed_at is null then
      raise exception 'complete your profile before publishing it' using errcode = '22023';
    end if;
    if not exists (
      select 1 from public.consents
      where institution_id = p_inst and user_id = auth.uid() and document = 'directory_publication' and withdrawn_at is null
    ) then
      raise exception 'consent to directory publication is required' using errcode = '22023';
    end if;
  end if;

  update public.alumni_profiles
  set visibility = p_visibility,
      published_at = case when p_visibility = 'members' then coalesce(published_at, now()) else published_at end
  where id = v_profile.id;

  if p_visibility = 'members' and v_profile.published_at is null then
    perform public.enqueue_email(p_inst, 'welcome', auth.uid(), (select email from auth.users where id = auth.uid()), v_profile.id);
  end if;
  perform public.log_audit(p_inst, 'profile.visibility', 'alumni_profile', v_profile.id::text,
    jsonb_build_object('visibility', p_visibility));
end $$;

-- From the email link: the page's POST button sends the token (GET never confirms, E6).
create function public.confirm_still_accurate(p_token text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_request public.confirmation_requests;
begin
  select * into v_request from public.confirmation_requests
  where token_hash = public.hash_token(p_token) and status = 'open';
  if not found then
    return false;
  end if;
  perform public.record_confirmation(v_request.profile_id, 'alumnus_still_accurate');
  perform public.log_audit(v_request.institution_id, 'profile.confirmed', 'alumni_profile', v_request.profile_id::text,
    '{"via": "email_link"}'::jsonb);
  return true;
end $$;

create function public.confirm_still_accurate_in_app(p_inst uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_profile uuid;
begin
  select id into v_profile from public.alumni_profiles
  where institution_id = p_inst and user_id = auth.uid() and status = 'active' and onboarding_completed_at is not null;
  if v_profile is null then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  perform public.record_confirmation(v_profile, 'alumnus_still_accurate');
  perform public.log_audit(p_inst, 'profile.confirmed', 'alumni_profile', v_profile::text, '{"via": "app"}'::jsonb);
end $$;

create function public.set_my_locale(p_locale public.locale) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  insert into public.user_preferences (user_id, locale) values (auth.uid(), p_locale)
  on conflict (user_id) do update set locale = excluded.locale;
end $$;

-- Self-deletion: hidden at once, purged by the retention job within 30 days (DEC-08). The login itself is
-- removed only when no membership is left at any school (ADR 0002).
create function public.delete_my_profile(p_inst uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_profile uuid;
begin
  update public.alumni_profiles
  set status = 'deleted', visibility = 'hidden', deleted_at = now()
  where institution_id = p_inst and user_id = auth.uid() and status <> 'deleted'
  returning id into v_profile;
  if v_profile is null then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.institution_memberships set status = 'revoked', status_reason = 'self-deleted', status_changed_at = now()
  where institution_id = p_inst and user_id = auth.uid() and role = 'alumni';
  update public.consents set withdrawn_at = now()
  where institution_id = p_inst and user_id = auth.uid() and withdrawn_at is null;
  update public.confirmation_requests set status = 'superseded' where profile_id = v_profile and status = 'open';
  perform public.log_audit(p_inst, 'profile.self_deleted', 'alumni_profile', v_profile::text);
end $$;

create function public.export_my_data(p_inst uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_profile uuid;
  v_data jsonb;
begin
  select id into v_profile from public.alumni_profiles where institution_id = p_inst and user_id = auth.uid();
  select jsonb_build_object(
    'profile', (select to_jsonb(p) - 'institution_id' from public.alumni_profiles p where p.id = v_profile),
    'maiden_name', (select maiden_name from public.alumni_private where profile_id = v_profile),
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

-- Directory and contact (ADR 0006) ---------------------------------------------------------------------

-- Security invoker: runs under the caller's RLS, so it can only ever see what the caller may see.
-- p_filters keys (all optional): q, grad_year, career_field (key), offer (key), city, school, language.
create function public.search_directory(
  p_inst uuid, p_filters jsonb default '{}'::jsonb, p_limit int default 24, p_offset int default 0
) returns table (
  id uuid, first_name text, last_name text, preferred_name text, grad_year int, city text, country text,
  job_title text, employer text, career_field_key text, career_field_en text, career_field_fr text,
  schools text[], offers text[], total_count bigint
)
language sql stable security invoker set search_path = '' as $$
  select
    p.id, p.first_name, p.last_name, p.preferred_name, p.grad_year, p.city, p.country, p.job_title, p.employer,
    c.key, c.label_en, c.label_fr,
    array(select e.school from public.alumni_education e where e.profile_id = p.id order by e.sort_order),
    array(select o.key from public.profile_offers po join public.offer_types o on o.id = po.offer_type_id
          where po.profile_id = p.id order by o.sort_order),
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
  order by p.last_name, p.first_name, p.id
  limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0);
$$;

-- Reveals one channel of one profile and logs it as "Contact initiated" (no daily limit, DEC-03).
create function public.initiate_contact(p_profile uuid, p_channel public.channel_type) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_inst uuid;
  v_value text;
begin
  select institution_id into v_inst from public.alumni_profiles
  where id = p_profile and status = 'active' and visibility = 'members';
  if v_inst is null or not public.has_permission(v_inst, 'directory.use') then
    raise exception 'not available' using errcode = '42501';
  end if;
  select value into v_value from public.profile_contact_channels
  where profile_id = p_profile and type = p_channel and is_public;
  if v_value is null then
    raise exception 'not available' using errcode = '42501';
  end if;
  if not public.owns_profile(p_profile) and not exists (
    select 1 from public.contact_events
    where initiator_user_id = auth.uid() and recipient_profile_id = p_profile and channel = p_channel
      and created_at > now() - interval '24 hours'
  ) then
    insert into public.contact_events (institution_id, initiator_user_id, recipient_profile_id, channel)
    values (v_inst, auth.uid(), p_profile, p_channel);
  end if;
  return v_value;
end $$;

-- Staff: records --------------------------------------------------------------------------------------

-- Staff edits never move last_confirmed_at (E5).
create function public.admin_update_profile(p_profile uuid, p_patch jsonb) returns void
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
      school_student_id = case when p_patch ? 'school_student_id' then nullif(trim(p_patch ->> 'school_student_id'), '') else school_student_id end
    where profile_id = p_profile;
  end if;

  perform public.log_audit(v_inst, 'profile.admin_updated', 'alumni_profile', p_profile::text,
    jsonb_build_object('fields', (select jsonb_agg(k) from jsonb_object_keys(p_patch) k)));
end $$;

create function public.set_profile_status(p_profile uuid, p_status public.profile_status, p_reason text default null)
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
    jsonb_build_object('from', v_profile.status, 'to', p_status));
end $$;

-- Staff: people ----------------------------------------------------------------------------------------

create function public.invite_staff(p_inst uuid, p_email text, p_role public.member_role) returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_permission(p_inst, 'staff.manage');
  return public.create_staff_invitation(p_inst, p_email, p_role);
end $$;

create function public.accept_staff_invitation(p_token text) returns uuid
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
    set role = excluded.role, status = 'active', status_reason = null, status_changed_at = now();
  update public.staff_invitations set accepted_by = auth.uid(), accepted_at = now() where id = v_inv.id;
  perform public.log_audit(v_inv.institution_id, 'staff.joined', 'staff_invitation', v_inv.id::text,
    jsonb_build_object('role', v_inv.role));
  return v_inv.institution_id;
end $$;

create function public.change_staff_role(p_inst uuid, p_user uuid, p_role public.member_role) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_permission(p_inst, 'staff.manage');
  if p_role not in ('school_admin', 'reviewer') then
    raise exception 'invalid staff role' using errcode = '22023';
  end if;
  if p_role <> 'school_admin' then
    perform public.assert_last_school_admin_kept(p_inst, p_user);
  end if;
  update public.institution_memberships set role = p_role
  where institution_id = p_inst and user_id = p_user and status = 'active' and role in ('school_admin', 'reviewer');
  if not found then
    raise exception 'not a staff member' using errcode = '22023';
  end if;
  perform public.log_audit(p_inst, 'staff.role_changed', 'user', p_user::text, jsonb_build_object('role', p_role));
end $$;

-- A removed staff member who is also an approved alumnus stays an alumnus; otherwise access is revoked.
create function public.remove_staff(p_inst uuid, p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_permission(p_inst, 'staff.manage');
  perform public.assert_last_school_admin_kept(p_inst, p_user);
  update public.institution_memberships set
    role = case when exists (select 1 from public.alumni_profiles
                             where institution_id = p_inst and user_id = p_user and status = 'active')
                then 'alumni'::public.member_role else role end,
    status = case when exists (select 1 from public.alumni_profiles
                               where institution_id = p_inst and user_id = p_user and status = 'active')
                  then 'active'::public.member_status else 'revoked'::public.member_status end,
    status_changed_by = auth.uid(), status_changed_at = now()
  where institution_id = p_inst and user_id = p_user and role in ('school_admin', 'reviewer');
  if not found then
    raise exception 'not a staff member' using errcode = '22023';
  end if;
  perform public.log_audit(p_inst, 'staff.removed', 'user', p_user::text);
end $$;

-- Staff: email templates and settings ------------------------------------------------------------------

create function public.save_email_template(
  p_inst uuid, p_key public.email_template_key, p_locale public.locale, p_subject text, p_body text
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_permission(p_inst, 'templates.manage');
  perform public.validate_template_text(p_subject, p_body);
  insert into public.email_templates (institution_id, key, locale, status, subject, body, edited_by)
  values (p_inst, p_key, p_locale, 'draft', trim(p_subject), p_body, auth.uid())
  on conflict (institution_id, key, locale, status) do update
    set subject = excluded.subject, body = excluded.body, edited_by = excluded.edited_by;
  perform public.log_audit(p_inst, 'template.saved', 'email_template', p_key::text, jsonb_build_object('locale', p_locale));
end $$;

create function public.approve_email_template(p_inst uuid, p_key public.email_template_key, p_locale public.locale)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_permission(p_inst, 'templates.manage');
  if not exists (select 1 from public.email_templates
                 where institution_id = p_inst and key = p_key and locale = p_locale and status = 'draft') then
    raise exception 'save a draft first' using errcode = '22023';
  end if;
  delete from public.email_templates
  where institution_id = p_inst and key = p_key and locale = p_locale and status = 'approved';
  update public.email_templates set status = 'approved', approved_by = auth.uid(), approved_at = now()
  where institution_id = p_inst and key = p_key and locale = p_locale and status = 'draft';
  perform public.log_audit(p_inst, 'template.approved', 'email_template', p_key::text, jsonb_build_object('locale', p_locale));
end $$;

create function public.update_school_settings(p_inst uuid, p_patch jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_permission(p_inst, 'settings.manage');
  update public.institutions set
    email_display_name = case when p_patch ? 'email_display_name' then nullif(trim(p_patch ->> 'email_display_name'), '') else email_display_name end,
    reply_to_email = case when p_patch ? 'reply_to_email' then nullif(lower(trim(p_patch ->> 'reply_to_email')), '') else reply_to_email end,
    default_locale = case when p_patch ? 'default_locale' then (p_patch ->> 'default_locale')::public.locale else default_locale end,
    branding = case when p_patch ? 'branding' then p_patch -> 'branding' else branding end,
    confirmation_interval_months = case when p_patch ? 'confirmation_interval_months'
      then (p_patch ->> 'confirmation_interval_months')::int else confirmation_interval_months end
  where id = p_inst;
  perform public.log_audit(p_inst, 'school.settings_updated', 'institution', p_inst::text,
    jsonb_build_object('fields', (select jsonb_agg(k) from jsonb_object_keys(p_patch) k)));
end $$;

-- System admins (Gab, Noah) ----------------------------------------------------------------------------

create function public.platform_create_school(
  p_name text, p_slug text, p_default_locale public.locale default 'en', p_reply_to text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if not public.is_system_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  insert into public.institutions (name, slug, default_locale, reply_to_email)
  values (trim(p_name), lower(trim(p_slug)), p_default_locale, nullif(lower(trim(p_reply_to)), ''))
  returning id into v_id;
  perform public.log_audit(v_id, 'school.created', 'institution', v_id::text, jsonb_build_object('slug', p_slug));
  return v_id;
end $$;

create function public.platform_appoint_school_admin(p_inst uuid, p_email text) returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_system_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return public.create_staff_invitation(p_inst, p_email, 'school_admin');
end $$;

-- Read-only, time-boxed (at most 8 h) and visible to the school's admins in the audit log.
create function public.platform_open_grant(p_inst uuid, p_reason text, p_hours int default 1) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if not public.is_system_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_hours not between 1 and 8 then
    raise exception 'a grant lasts 1 to 8 hours' using errcode = '22023';
  end if;
  insert into public.platform_access_grants (user_id, institution_id, reason, expires_at)
  values (auth.uid(), p_inst, trim(p_reason), now() + make_interval(hours => p_hours))
  returning id into v_id;
  perform public.log_audit(p_inst, 'platform.grant_opened', 'platform_access_grant', v_id::text,
    jsonb_build_object('reason', trim(p_reason), 'hours', p_hours));
  return v_id;
end $$;

create function public.platform_revoke_grant(p_grant uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_inst uuid;
begin
  update public.platform_access_grants set revoked_at = now()
  where id = p_grant and user_id = auth.uid() and revoked_at is null
  returning institution_id into v_inst;
  if v_inst is null then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  perform public.log_audit(v_inst, 'platform.grant_revoked', 'platform_access_grant', p_grant::text);
end $$;

-- Service role only (email worker) ---------------------------------------------------------------------

-- Mints a single-use token at send time. Only the hash is stored; the raw token goes into the email.
create function public.mint_token(p_kind text, p_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_token text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  if p_kind = 'staff_invitation' then
    update public.staff_invitations set token_hash = public.hash_token(v_token)
    where id = p_id and accepted_at is null and revoked_at is null;
  elsif p_kind = 'confirmation_request' then
    update public.confirmation_requests set token_hash = public.hash_token(v_token)
    where id = p_id and status = 'open';
  else
    raise exception 'unknown token kind %', p_kind using errcode = '22023';
  end if;
  if not found then
    raise exception 'nothing to mint a token for' using errcode = '22023';
  end if;
  return v_token;
end $$;

-- Grants -----------------------------------------------------------------------------------------------

revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function
  public.is_system_admin(), public.has_active_grant(uuid), public.is_member(uuid),
  public.has_permission(uuid, text), public.owns_profile(uuid), public.profile_is_visible(uuid)
  to authenticated;

grant execute on function
  public.public_school(text),
  public.confirm_still_accurate(text)
  to anon, authenticated;

grant execute on function
  public.request_access(uuid, text, text, text, int, text),
  public.reply_to_info_request(uuid, text),
  public.withdraw_access_request(uuid),
  public.decide_access_request(uuid, text, text, uuid),
  public.save_my_profile(uuid, jsonb),
  public.record_consent(uuid, public.consent_document, text),
  public.withdraw_consent(uuid, public.consent_document),
  public.set_my_visibility(uuid, public.profile_visibility),
  public.confirm_still_accurate_in_app(uuid),
  public.set_my_locale(public.locale),
  public.delete_my_profile(uuid),
  public.export_my_data(uuid),
  public.search_directory(uuid, jsonb, int, int),
  public.initiate_contact(uuid, public.channel_type),
  public.admin_update_profile(uuid, jsonb),
  public.set_profile_status(uuid, public.profile_status, text),
  public.invite_staff(uuid, text, public.member_role),
  public.accept_staff_invitation(text),
  public.change_staff_role(uuid, uuid, public.member_role),
  public.remove_staff(uuid, uuid),
  public.save_email_template(uuid, public.email_template_key, public.locale, text, text),
  public.approve_email_template(uuid, public.email_template_key, public.locale),
  public.update_school_settings(uuid, jsonb),
  public.platform_create_school(text, text, public.locale, text),
  public.platform_appoint_school_admin(uuid, text),
  public.platform_open_grant(uuid, text, int),
  public.platform_revoke_grant(uuid)
  to authenticated;

grant execute on function public.mint_token(text, uuid), public.enqueue_email(uuid, public.email_template_key, uuid, text, uuid)
  to service_role;
