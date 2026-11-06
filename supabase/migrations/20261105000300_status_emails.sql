-- EML-08: every status change of a request or a membership emails the person, through the outbox (EML-01).
-- Decisions (approved, needs info, declined) already queue an email; this adds request received, withdrawn,
-- access suspended and access reactivated, and the claim function the outbox worker uses.

-- 1. Platform default texts, EN and FR. Only the existing placeholders. The suspension email never carries the
--    admin's reason: it is an internal note.
insert into public.email_templates (institution_id, key, locale, status, subject, body) values
  (null, 'access_received', 'en', 'approved', 'We received your request to join the {school_name} Alumni Network',
   E'Hi {first_name},\n\nThanks for your request to join the {school_name} Alumni Network. The alumni office will review it and email you as soon as they decide. You can check where it stands at any time:\n\n{sign_in_link}'),
  (null, 'access_received', 'fr', 'approved', 'Nous avons reçu votre demande au Réseau des anciens de {school_name}',
   E'Bonjour {first_name},\n\nMerci pour votre demande d''adhésion au Réseau des anciens de {school_name}. Le bureau des anciens va l''examiner et vous écrira dès qu''une décision sera prise. Vous pouvez suivre votre demande en tout temps :\n\n{sign_in_link}'),
  (null, 'access_withdrawn', 'en', 'approved', 'Your {school_name} Alumni Network request was withdrawn',
   E'Hi {first_name},\n\nYou withdrew your request to join the {school_name} Alumni Network, so the alumni office will not review it. If you change your mind, you can send a new request:\n\n{sign_in_link}\n\nIf you did not withdraw it, reply to this email.'),
  (null, 'access_withdrawn', 'fr', 'approved', 'Votre demande au Réseau des anciens de {school_name} a été retirée',
   E'Bonjour {first_name},\n\nVous avez retiré votre demande d''adhésion au Réseau des anciens de {school_name}; le bureau des anciens ne l''examinera donc pas. Si vous changez d''avis, vous pouvez envoyer une nouvelle demande :\n\n{sign_in_link}\n\nSi vous n''avez pas retiré cette demande, répondez à ce courriel.'),
  (null, 'membership_suspended', 'en', 'approved', 'Your {school_name} Alumni Network access is suspended',
   E'Hi {first_name},\n\nThe {school_name} alumni office has suspended your access to the Alumni Network. While it is suspended, your profile is hidden from other alumni.\n\nIf you have questions, reply to this email to reach the alumni office.'),
  (null, 'membership_suspended', 'fr', 'approved', 'Votre accès au Réseau des anciens de {school_name} est suspendu',
   E'Bonjour {first_name},\n\nLe bureau des anciens de {school_name} a suspendu votre accès au Réseau des anciens. Pendant la suspension, votre profil est caché des autres anciens.\n\nPour toute question, répondez à ce courriel pour joindre le bureau des anciens.'),
  (null, 'membership_reactivated', 'en', 'approved', 'Your {school_name} Alumni Network access is restored',
   E'Hi {first_name},\n\nThe {school_name} alumni office has restored your access to the Alumni Network. Sign in to pick up where you left off:\n\n{sign_in_link}'),
  (null, 'membership_reactivated', 'fr', 'approved', 'Votre accès au Réseau des anciens de {school_name} est rétabli',
   E'Bonjour {first_name},\n\nLe bureau des anciens de {school_name} a rétabli votre accès au Réseau des anciens. Connectez-vous pour reprendre là où vous en étiez :\n\n{sign_in_link}');

-- 2. Schools that already exist get the new texts as drafts. An admin approves them in /admin/templates before
--    anything is sent (DEC-06); until then these emails are recorded as skipped_no_template.
insert into public.email_templates (institution_id, key, locale, status, subject, body)
select i.id, t.key, t.locale, 'draft', t.subject, t.body
from public.institutions i
cross join public.email_templates t
where t.institution_id is null
  and t.key in ('access_received', 'access_withdrawn', 'membership_suspended', 'membership_reactivated')
on conflict do nothing;

-- 3. Request received: a new request (or a new one after a decision or a withdrawal). Editing an open request
--    sends nothing.
create or replace function public.request_access(
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
    perform public.enqueue_email(p_inst, 'access_received', v_uid, v_email, v_id);
  end if;
end $$;

-- 4. The applicant answered the school's question: the request is pending again.
create or replace function public.reply_to_info_request(p_request uuid, p_reply text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  r public.access_requests;
begin
  update public.access_requests set applicant_reply = trim(p_reply), status = 'pending'
  where id = p_request and user_id = auth.uid() and status = 'needs_info'
  returning * into r;
  if r.id is null then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  perform public.log_audit(r.institution_id, 'access_request.replied', 'access_request', p_request::text);
  perform public.enqueue_email(r.institution_id, 'access_received', r.user_id, r.email, r.id);
end $$;

-- 5. Withdrawn by the applicant.
create or replace function public.withdraw_access_request(p_request uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  r public.access_requests;
begin
  update public.access_requests set status = 'withdrawn'
  where id = p_request and user_id = auth.uid() and status in ('pending', 'needs_info')
  returning * into r;
  if r.id is null then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  perform public.log_audit(r.institution_id, 'access_request.withdrawn', 'access_request', p_request::text);
  perform public.enqueue_email(r.institution_id, 'access_withdrawn', r.user_id, r.email, r.id);
end $$;

-- 6. Suspended and reactivated. Archived and deceased records are never emailed, and a record nobody has
--    claimed (no user) has no one to tell.
create or replace function public.set_profile_status(p_profile uuid, p_status public.profile_status, p_reason text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_profile public.alumni_profiles;
  v_email text;
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

    select email into v_email from auth.users where id = v_profile.user_id;
    if v_email is not null and v_profile.status = 'active' and p_status = 'suspended' then
      perform public.enqueue_email(v_profile.institution_id, 'membership_suspended', v_profile.user_id, v_email, p_profile);
    elsif v_email is not null and v_profile.status = 'suspended' and p_status = 'active' then
      perform public.enqueue_email(v_profile.institution_id, 'membership_reactivated', v_profile.user_id, v_email, p_profile);
    end if;
  end if;
  perform public.log_audit(v_profile.institution_id, 'profile.status', 'alumni_profile', p_profile::text,
    jsonb_build_object('from', v_profile.status, 'to', p_status, 'reason', nullif(trim(p_reason), '')));
end $$;

-- 7. The outbox worker claims the emails it can send (EML-01). Due queued rows, plus rows left in "sending" for
--    more than 10 minutes by a worker that died; the outbox id is the provider's idempotency key, so a reclaimed
--    row is never delivered twice. A stuck row that already used its 5 attempts becomes failed instead.
--    p_keys limits the claim to the templates the worker can render; p_subject to one business event.
create function public.claim_email_outbox(p_keys text[], p_subject uuid default null, p_limit int default 20)
returns setof public.email_outbox
language plpgsql security definer set search_path = '' as $$
begin
  update public.email_outbox
  set status = 'failed', last_error = coalesce(last_error, 'worker stopped while sending')
  where status = 'sending' and updated_at < now() - interval '10 minutes' and attempts >= 5;

  return query
  update public.email_outbox o
  set status = 'sending', attempts = o.attempts + 1
  where o.id in (
    select q.id from public.email_outbox q
    where ((q.status = 'queued' and q.next_attempt_at <= now())
           or (q.status = 'sending' and q.updated_at < now() - interval '10 minutes'))
      and q.template_key = any (p_keys)
      and (p_subject is null or q.subject_id = p_subject)
    order by q.next_attempt_at
    limit least(greatest(coalesce(p_limit, 20), 1), 100)
    for update skip locked
  )
  returning o.*;
end $$;

revoke execute on function public.claim_email_outbox(text[], uuid, int) from public, anon, authenticated;
grant execute on function public.claim_email_outbox(text[], uuid, int) to service_role;
