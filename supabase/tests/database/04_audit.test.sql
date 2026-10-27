-- Audit coverage (FND-12): each privileged RPC writes exactly one audit row with the expected action, raw
-- tokens never reach the log, and a new client RPC cannot ship without deciding whether it is audited.
-- Same seed ids as 01_isolation.test.sql. Append-only is checked in 00_structure.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

create function pg_temp.login(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true),
         set_config('role', 'authenticated', true);
$$;

-- Runs p_sql as p_uid (or as the anon / service_role database role when p_uid is null) and returns the
-- actions of the audit rows it wrote, oldest first.
create function pg_temp.audited(p_sql text, p_uid uuid default null, p_role text default 'anon')
returns text[] language plpgsql as $$
declare
  v_mark bigint := coalesce((select max(id) from public.audit_log), 0);
begin
  if p_uid is null then
    perform set_config('request.jwt.claims', json_build_object('role', p_role)::text, true),
            set_config('role', p_role, true);
  else
    perform pg_temp.login(p_uid);
  end if;
  execute p_sql;
  reset role;
  return (select coalesce(array_agg(action order by id), '{}') from public.audit_log where id > v_mark);
end $$;

-- Sign-up queue ---------------------------------------------------------------------------------------
select is(
  pg_temp.audited($$ select public.request_access('aaaaaaaa-0000-4000-8000-000000000001', 'Olive', 'Outsider', null, 2004, null) $$,
                  '11111111-1111-4111-8111-000000000011'),
  array['access_request.created'], 'request_access writes one audit row'
);
select is(
  pg_temp.audited($$ select public.withdraw_access_request(
                       (select id from public.access_requests where user_id = auth.uid() and status = 'pending')) $$,
                  '11111111-1111-4111-8111-000000000011'),
  array['access_request.withdrawn'], 'withdraw_access_request writes one audit row'
);
select is(
  pg_temp.audited($$ select public.reply_to_info_request('33333333-3333-4333-8333-000000000003', 'Mr. Katz, 12B') $$,
                  '11111111-1111-4111-8111-000000000012'),
  array['access_request.replied'], 'reply_to_info_request writes one audit row'
);
select is(
  pg_temp.audited($$ select public.decide_access_request('33333333-3333-4333-8333-000000000001', 'approve') $$,
                  '11111111-1111-4111-8111-000000000004'),
  array['access_request.approve'], 'approving writes one audit row (profile, membership and email included)'
);
select is(
  pg_temp.audited($$ select public.decide_access_request('33333333-3333-4333-8333-000000000003', 'reject', 'Not on the class list') $$,
                  '11111111-1111-4111-8111-000000000001'),
  array['access_request.reject'], 'rejecting writes one audit row'
);
select is(
  pg_temp.audited($$ select public.decide_access_request('33333333-3333-4333-8333-000000000002', 'needs_info', 'Quelle classe ?') $$,
                  '11111111-1111-4111-8111-000000000007'),
  array['access_request.needs_info'], 'asking for more information writes one audit row'
);

-- Alumni self-service (alumni@herzliah.test) ---------------------------------------------------------
select is(
  pg_temp.audited($$ select public.save_my_profile('aaaaaaaa-0000-4000-8000-000000000001', '{"profile": {"city": "Laval"}}') $$,
                  '11111111-1111-4111-8111-000000000002'),
  array['profile.saved'], 'save_my_profile writes one audit row'
);
select is(
  pg_temp.audited($$ select public.record_consent('aaaaaaaa-0000-4000-8000-000000000001', 'terms', '2026-11') $$,
                  '11111111-1111-4111-8111-000000000002'),
  array['consent.accepted'], 'record_consent writes one audit row'
);
select is(
  pg_temp.audited($$ select public.confirm_still_accurate_in_app('aaaaaaaa-0000-4000-8000-000000000001') $$,
                  '11111111-1111-4111-8111-000000000002'),
  array['profile.confirmed'], 'confirm_still_accurate_in_app writes one audit row'
);
select is(
  pg_temp.audited($$ select public.export_my_data('aaaaaaaa-0000-4000-8000-000000000001') $$,
                  '11111111-1111-4111-8111-000000000002'),
  array['profile.data_exported'], 'export_my_data writes one audit row'
);
select is(
  pg_temp.audited($$ select public.set_my_visibility('aaaaaaaa-0000-4000-8000-000000000001', 'hidden') $$,
                  '11111111-1111-4111-8111-000000000002'),
  array['profile.visibility'], 'set_my_visibility writes one audit row'
);
select is(
  pg_temp.audited($$ select public.withdraw_consent('aaaaaaaa-0000-4000-8000-000000000001', 'directory_publication') $$,
                  '11111111-1111-4111-8111-000000000002'),
  array['consent.withdrawn'], 'withdraw_consent writes one audit row'
);
select is(
  pg_temp.audited($$ select public.delete_my_profile('aaaaaaaa-0000-4000-8000-000000000002') $$,
                  '11111111-1111-4111-8111-000000000005'),
  array['profile.self_deleted'], 'delete_my_profile writes one audit row'
);

-- Confirmation from the email link (anonymous) ---------------------------------------------------------
insert into public.confirmation_requests (id, institution_id, profile_id, due_at)
values ('44444444-4444-4444-8444-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000002', now());
select set_config('test.confirm_token', public.mint_token('confirmation_request', '44444444-4444-4444-8444-000000000002'), true);
select is(
  pg_temp.audited($$ select public.confirm_still_accurate(current_setting('test.confirm_token')) $$),
  array['profile.confirmed'], 'confirm_still_accurate writes one audit row'
);
select is(
  (select actor_kind from public.audit_log where target_id = '00000000-0000-4000-8000-000000000002' and action = 'profile.confirmed'),
  'system', 'a confirmation by email link is recorded with no user'
);

-- Staff: records, people, texts and settings (school admin of herzliah) --------------------------------
select is(
  pg_temp.audited($$ select public.admin_update_profile('00000000-0000-4000-8000-000000000003', '{"city": "Quebec City", "admin_notes": "Moved"}') $$,
                  '11111111-1111-4111-8111-000000000001'),
  array['profile.admin_updated'], 'admin_update_profile writes one audit row'
);
select is(
  (select metadata -> 'fields' from public.audit_log where action = 'profile.admin_updated'),
  '["city", "admin_notes"]'::jsonb, 'the audit row names the changed fields, not their values'
);
select is(
  pg_temp.audited($$ select public.set_profile_status('00000000-0000-4000-8000-000000000004', 'archived', 'Asked to be removed') $$,
                  '11111111-1111-4111-8111-000000000001'),
  array['profile.status'], 'set_profile_status writes one audit row'
);
select is(
  pg_temp.audited($$ select public.invite_staff('aaaaaaaa-0000-4000-8000-000000000001', 'outsider@alumninetwork.test', 'reviewer') $$,
                  '11111111-1111-4111-8111-000000000001'),
  array['staff.invited'], 'invite_staff writes one audit row'
);
select set_config('test.staff_token',
  (select public.mint_token('staff_invitation', id) from public.staff_invitations where email = 'outsider@alumninetwork.test'), true);
select is(
  pg_temp.audited($$ select public.accept_staff_invitation(current_setting('test.staff_token')) $$,
                  '11111111-1111-4111-8111-000000000011'),
  array['staff.joined'], 'accept_staff_invitation writes one audit row'
);
select is(
  pg_temp.audited($$ select public.change_staff_role('aaaaaaaa-0000-4000-8000-000000000001', '11111111-1111-4111-8111-000000000011', 'school_admin') $$,
                  '11111111-1111-4111-8111-000000000001'),
  array['staff.role_changed'], 'change_staff_role writes one audit row'
);
select is(
  pg_temp.audited($$ select public.remove_staff('aaaaaaaa-0000-4000-8000-000000000001', '11111111-1111-4111-8111-000000000011') $$,
                  '11111111-1111-4111-8111-000000000001'),
  array['staff.removed'], 'remove_staff writes one audit row'
);
select is(
  pg_temp.audited($$ select public.save_email_template('aaaaaaaa-0000-4000-8000-000000000001', 'welcome', 'en', 'Welcome!', 'Hi {first_name}') $$,
                  '11111111-1111-4111-8111-000000000001'),
  array['template.saved'], 'save_email_template writes one audit row'
);
select is(
  pg_temp.audited($$ select public.approve_email_template('aaaaaaaa-0000-4000-8000-000000000001', 'welcome', 'en') $$,
                  '11111111-1111-4111-8111-000000000001'),
  array['template.approved'], 'approve_email_template writes one audit row'
);
select is(
  pg_temp.audited($$ select public.update_school_settings('aaaaaaaa-0000-4000-8000-000000000001', '{"reply_to_email": "office@herzliah.test"}') $$,
                  '11111111-1111-4111-8111-000000000001'),
  array['school.settings_updated'], 'update_school_settings writes one audit row'
);

-- Platform --------------------------------------------------------------------------------------------
select is(
  pg_temp.audited($$ select public.platform_create_school('Third School', 'third-school') $$,
                  '11111111-1111-4111-8111-000000000006'),
  array['school.created'], 'platform_create_school writes one audit row'
);
select is(
  pg_temp.audited($$ select public.platform_appoint_school_admin((select id from public.institutions where slug = 'third-school'), 'head@third.test') $$,
                  '11111111-1111-4111-8111-000000000006'),
  array['staff.invited'], 'platform_appoint_school_admin writes one audit row'
);
select is(
  pg_temp.audited($$ select public.platform_open_grant('aaaaaaaa-0000-4000-8000-000000000001', 'Support ticket 31', 1) $$,
                  '11111111-1111-4111-8111-000000000006'),
  array['platform.grant_opened'], 'platform_open_grant writes one audit row'
);
select set_config('test.grant', (select id::text from public.platform_access_grants where revoked_at is null), true);
select is(
  pg_temp.audited($$ select public.platform_revoke_grant(current_setting('test.grant')::uuid) $$,
                  '11111111-1111-4111-8111-000000000006'),
  array['platform.grant_revoked'], 'platform_revoke_grant writes one audit row'
);

-- Bootstrap (FND-13): service role only, idempotent ----------------------------------------------------
select is(
  pg_temp.audited($$ select public.platform_add_admin(' Outsider@AlumniNetwork.test ') $$, null, 'service_role'),
  array['platform.admin_added'], 'platform_add_admin writes one audit row'
);
select ok(
  exists (select 1 from public.platform_admins where user_id = '11111111-1111-4111-8111-000000000011'),
  'the account is now a system admin'
);
select is(
  pg_temp.audited($$ select public.platform_add_admin('outsider@alumninetwork.test') $$, null, 'service_role'),
  '{}'::text[], 'adding an existing system admin changes nothing and writes no audit row'
);
update auth.users set email_confirmed_at = null where id = '11111111-1111-4111-8111-000000000009';
set local role service_role;
select throws_ok($$ select public.platform_add_admin('pending@test-school.test') $$, 'P0002', null,
  'an unverified account cannot be made a system admin');
select throws_ok($$ select public.platform_add_admin('nobody@example.test') $$, 'P0002', null,
  'an unknown email is refused');
reset role;
select pg_temp.login('11111111-1111-4111-8111-000000000006');
select throws_ok($$ select public.platform_add_admin('alumni@herzliah.test') $$, '42501', null,
  'not even a system admin can call it from the app');
reset role;

-- Not audited on purpose -------------------------------------------------------------------------------
select is(
  pg_temp.audited($$ select public.set_my_locale('fr') $$, '11111111-1111-4111-8111-000000000004'),
  '{}'::text[], 'a language preference is not audited'
);
select is(
  pg_temp.audited($$ select public.initiate_contact('00000000-0000-4000-8000-000000000005', 'email') $$,
                  '11111111-1111-4111-8111-000000000003'),
  '{}'::text[], 'contact reveals are logged in contact_events, not the audit log (DEC-03)'
);

-- Secrets never reach the log ---------------------------------------------------------------------------
select is_empty(
  format($$ select id from public.audit_log where target_id in (%L, %L) or metadata::text like %L or metadata::text like %L $$,
         current_setting('test.confirm_token'), current_setting('test.staff_token'),
         '%' || current_setting('test.confirm_token') || '%', '%' || current_setting('test.staff_token') || '%'),
  'raw tokens never appear in the audit log'
);

-- Every client-callable function is accounted for --------------------------------------------------------
-- Adding an RPC fails this test until it is added to one of the lists below, with its audit test above.
select set_eq(
  $$ select p.proname::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and (has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute')) $$,
  array[
    -- audited, tested above
    'request_access', 'withdraw_access_request', 'reply_to_info_request', 'decide_access_request',
    'save_my_profile', 'record_consent', 'confirm_still_accurate_in_app', 'export_my_data', 'set_my_visibility',
    'withdraw_consent', 'delete_my_profile', 'confirm_still_accurate',
    'admin_update_profile', 'set_profile_status', 'invite_staff', 'accept_staff_invitation', 'change_staff_role',
    'remove_staff', 'save_email_template', 'approve_email_template', 'update_school_settings',
    'platform_create_school', 'platform_appoint_school_admin', 'platform_open_grant', 'platform_revoke_grant',
    -- not audited on purpose: reads, preferences, and contact reveals (contact_events)
    'public_school', 'search_directory', 'set_my_locale', 'initiate_contact',
    -- RLS helpers used inside policies (and by search_directory, which runs as the caller)
    'is_system_admin', 'has_active_grant', 'is_member', 'has_permission', 'permitted_institutions', 'my_profile_ids',
    'directory_profile_ids'
  ],
  'every client-callable function is audited, deliberately unaudited, or an RLS helper'
);

select * from finish();
rollback;
