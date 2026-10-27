-- Refused writes (FND-06): every write RPC called across schools and above each role, plus direct table writes.
-- A refused call changes nothing. Same seed ids as 01_isolation.test.sql; the allowed paths are in 02_rpcs and
-- 04_audit.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

create function pg_temp.login(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true),
         set_config('role', 'authenticated', true);
$$;

-- Runs p_sql as p_uid and expects it to fail with p_errcode.
create function pg_temp.refused(p_uid uuid, p_sql text, p_description text, p_errcode text default '42501')
returns text language plpgsql as $$
declare
  v_tap text;
begin
  perform pg_temp.login(p_uid);
  v_tap := throws_ok(p_sql, p_errcode, null, p_description);
  reset role;
  return v_tap;
end $$;

-- Staff of one school against the other ---------------------------------------------------------------
-- 01 = school admin H, 07 = school admin T. Each block mirrors the other.
select pg_temp.refused(who::uuid, sql, description) from (values
  ('11111111-1111-4111-8111-000000000001', $$ select public.decide_access_request('33333333-3333-4333-8333-000000000002', 'approve') $$,
   'H admin cannot approve a T request'),
  ('11111111-1111-4111-8111-000000000001', $$ select public.decide_access_request('33333333-3333-4333-8333-000000000002', 'reject', 'No') $$,
   'H admin cannot reject a T request'),
  ('11111111-1111-4111-8111-000000000001', $$ select public.admin_update_profile('22222222-2222-4222-8222-000000000003', '{"city": "Paris"}') $$,
   'H admin cannot edit a T record'),
  ('11111111-1111-4111-8111-000000000001', $$ select public.set_profile_status('22222222-2222-4222-8222-000000000003', 'suspended', 'Cross-school') $$,
   'H admin cannot suspend a T record'),
  ('11111111-1111-4111-8111-000000000001', $$ select public.invite_staff('aaaaaaaa-0000-4000-8000-000000000002', 'x@evil.test', 'school_admin') $$,
   'H admin cannot invite staff to T'),
  ('11111111-1111-4111-8111-000000000001', $$ select public.change_staff_role('aaaaaaaa-0000-4000-8000-000000000002', '11111111-1111-4111-8111-000000000008', 'school_admin') $$,
   'H admin cannot change a T staff role'),
  ('11111111-1111-4111-8111-000000000001', $$ select public.remove_staff('aaaaaaaa-0000-4000-8000-000000000002', '11111111-1111-4111-8111-000000000008') $$,
   'H admin cannot remove T staff'),
  ('11111111-1111-4111-8111-000000000001', $$ select public.save_email_template('aaaaaaaa-0000-4000-8000-000000000002', 'welcome', 'fr', 'X', 'Y') $$,
   'H admin cannot edit T email texts'),
  ('11111111-1111-4111-8111-000000000001', $$ select public.approve_email_template('aaaaaaaa-0000-4000-8000-000000000002', 'welcome', 'fr') $$,
   'H admin cannot approve T email texts'),
  ('11111111-1111-4111-8111-000000000001', $$ select public.update_school_settings('aaaaaaaa-0000-4000-8000-000000000002', '{"reply_to_email": "evil@evil.test"}') $$,
   'H admin cannot change T settings'),

  ('11111111-1111-4111-8111-000000000007', $$ select public.decide_access_request('33333333-3333-4333-8333-000000000001', 'approve') $$,
   'T admin cannot approve an H request'),
  ('11111111-1111-4111-8111-000000000007', $$ select public.decide_access_request('33333333-3333-4333-8333-000000000001', 'needs_info', 'Who?') $$,
   'T admin cannot question an H applicant'),
  ('11111111-1111-4111-8111-000000000007', $$ select public.admin_update_profile('00000000-0000-4000-8000-000000000002', '{"city": "Paris"}') $$,
   'T admin cannot edit an H record'),
  ('11111111-1111-4111-8111-000000000007', $$ select public.set_profile_status('00000000-0000-4000-8000-000000000002', 'archived', 'Cross-school') $$,
   'T admin cannot archive an H record'),
  ('11111111-1111-4111-8111-000000000007', $$ select public.invite_staff('aaaaaaaa-0000-4000-8000-000000000001', 'x@evil.test', 'school_admin') $$,
   'T admin cannot invite staff to H'),
  ('11111111-1111-4111-8111-000000000007', $$ select public.change_staff_role('aaaaaaaa-0000-4000-8000-000000000001', '11111111-1111-4111-8111-000000000004', 'school_admin') $$,
   'T admin cannot change an H staff role'),
  ('11111111-1111-4111-8111-000000000007', $$ select public.remove_staff('aaaaaaaa-0000-4000-8000-000000000001', '11111111-1111-4111-8111-000000000004') $$,
   'T admin cannot remove H staff'),
  ('11111111-1111-4111-8111-000000000007', $$ select public.save_email_template('aaaaaaaa-0000-4000-8000-000000000001', 'welcome', 'en', 'X', 'Y') $$,
   'T admin cannot edit H email texts'),
  ('11111111-1111-4111-8111-000000000007', $$ select public.approve_email_template('aaaaaaaa-0000-4000-8000-000000000001', 'welcome', 'en') $$,
   'T admin cannot approve H email texts'),
  ('11111111-1111-4111-8111-000000000007', $$ select public.update_school_settings('aaaaaaaa-0000-4000-8000-000000000001', '{"reply_to_email": "evil@evil.test"}') $$,
   'T admin cannot change H settings'),

  ('11111111-1111-4111-8111-000000000004', $$ select public.decide_access_request('33333333-3333-4333-8333-000000000002', 'approve') $$,
   'H reviewer cannot approve a T request'),
  ('11111111-1111-4111-8111-000000000008', $$ select public.decide_access_request('33333333-3333-4333-8333-000000000001', 'approve') $$,
   'T reviewer cannot approve an H request')
) as t(who, sql, description);

-- Reviewers stay within their permissions at their own school ------------------------------------------
select pg_temp.refused('11111111-1111-4111-8111-000000000004'::uuid, sql, description) from (values
  ($$ select public.set_profile_status('00000000-0000-4000-8000-000000000003', 'suspended', 'Not mine to do') $$,
   'a reviewer cannot suspend a record'),
  ($$ select public.change_staff_role('aaaaaaaa-0000-4000-8000-000000000001', '11111111-1111-4111-8111-000000000004', 'school_admin') $$,
   'a reviewer cannot promote themselves'),
  ($$ select public.remove_staff('aaaaaaaa-0000-4000-8000-000000000001', '11111111-1111-4111-8111-000000000001') $$,
   'a reviewer cannot remove the school admin'),
  ($$ select public.approve_email_template('aaaaaaaa-0000-4000-8000-000000000001', 'welcome', 'en') $$,
   'a reviewer cannot approve email texts'),
  ($$ select public.update_school_settings('aaaaaaaa-0000-4000-8000-000000000001', '{"default_locale": "fr"}') $$,
   'a reviewer cannot change school settings')
) as t(sql, description);

-- Alumni cannot use staff or platform RPCs ------------------------------------------------------------
select pg_temp.refused('11111111-1111-4111-8111-000000000002'::uuid, sql, description) from (values
  ($$ select public.admin_update_profile('00000000-0000-4000-8000-000000000002', '{"city": "Paris"}') $$,
   'an alumnus cannot edit another record'),
  ($$ select public.admin_update_profile('00000000-0000-4000-8000-000000000001', '{"admin_notes": "Self"}') $$,
   'an alumnus cannot use the staff editor on their own record'),
  ($$ select public.set_profile_status('00000000-0000-4000-8000-000000000002', 'suspended', 'Rival') $$,
   'an alumnus cannot suspend a record'),
  ($$ select public.invite_staff('aaaaaaaa-0000-4000-8000-000000000001', 'friend@example.test', 'school_admin') $$,
   'an alumnus cannot invite staff'),
  ($$ select public.change_staff_role('aaaaaaaa-0000-4000-8000-000000000001', '11111111-1111-4111-8111-000000000002', 'school_admin') $$,
   'an alumnus cannot make themselves school admin'),
  ($$ select public.remove_staff('aaaaaaaa-0000-4000-8000-000000000001', '11111111-1111-4111-8111-000000000001') $$,
   'an alumnus cannot remove staff'),
  ($$ select public.save_email_template('aaaaaaaa-0000-4000-8000-000000000001', 'welcome', 'en', 'X', 'Y') $$,
   'an alumnus cannot edit email texts'),
  ($$ select public.update_school_settings('aaaaaaaa-0000-4000-8000-000000000001', '{"default_locale": "fr"}') $$,
   'an alumnus cannot change school settings'),
  ($$ select public.platform_create_school('Mine', 'mine') $$, 'an alumnus cannot create a school'),
  ($$ select public.platform_appoint_school_admin('aaaaaaaa-0000-4000-8000-000000000001', 'me@example.test') $$,
   'an alumnus cannot appoint a school admin'),
  ($$ select public.platform_open_grant('aaaaaaaa-0000-4000-8000-000000000002', 'Curious about them', 1) $$,
   'an alumnus cannot open a platform grant'),
  ($$ select public.platform_revoke_grant(gen_random_uuid()) $$, 'an alumnus cannot revoke a platform grant'),
  ($$ select public.reply_to_info_request('33333333-3333-4333-8333-000000000003', 'Not my request') $$,
   'an alumnus cannot answer someone else''s request'),
  ($$ select public.withdraw_access_request('33333333-3333-4333-8333-000000000001') $$,
   'an alumnus cannot withdraw someone else''s request')
) as t(sql, description);

-- Self-service RPCs only act at the caller's own school ------------------------------------------------
select pg_temp.refused(who::uuid, sql, description) from (values
  ('11111111-1111-4111-8111-000000000002', $$ select public.set_my_visibility('aaaaaaaa-0000-4000-8000-000000000002', 'members') $$,
   'an H alumnus cannot publish at T'),
  ('11111111-1111-4111-8111-000000000002', $$ select public.withdraw_consent('aaaaaaaa-0000-4000-8000-000000000002', 'terms') $$,
   'an H alumnus cannot withdraw consent at T (and writes nothing to T''s audit log)'),
  ('11111111-1111-4111-8111-000000000002', $$ select public.confirm_still_accurate_in_app('aaaaaaaa-0000-4000-8000-000000000002') $$,
   'an H alumnus cannot confirm a profile at T'),
  ('11111111-1111-4111-8111-000000000002', $$ select public.delete_my_profile('aaaaaaaa-0000-4000-8000-000000000002') $$,
   'an H alumnus cannot delete a profile at T'),
  ('11111111-1111-4111-8111-000000000002', $$ select public.export_my_data('aaaaaaaa-0000-4000-8000-000000000002') $$,
   'an H alumnus cannot export from T'),
  ('11111111-1111-4111-8111-000000000005', $$ select public.save_my_profile('aaaaaaaa-0000-4000-8000-000000000001', '{"profile": {"city": "X"}}') $$,
   'a T alumnus cannot save a profile at H'),
  ('11111111-1111-4111-8111-000000000005', $$ select public.withdraw_consent('aaaaaaaa-0000-4000-8000-000000000001', 'directory_publication') $$,
   'a T alumnus cannot withdraw consent at H'),
  ('11111111-1111-4111-8111-000000000005', $$ select public.record_consent('aaaaaaaa-0000-4000-8000-000000000001', 'terms', '2026-10') $$,
   'a T alumnus cannot record consent at H'),
  ('11111111-1111-4111-8111-000000000005', $$ select public.initiate_contact('00000000-0000-4000-8000-000000000002', 'email') $$,
   'a T alumnus cannot reveal an H email'),
  ('11111111-1111-4111-8111-000000000005', $$ select public.initiate_contact('00000000-0000-4000-8000-000000000002', 'linkedin') $$,
   'a T alumnus cannot reveal an H link either')
) as t(who, sql, description);

-- Suspended alumnus, applicants and a verified account with no school ----------------------------------
select pg_temp.refused(who::uuid, sql, description) from (values
  ('11111111-1111-4111-8111-000000000010', $$ select public.save_my_profile('aaaaaaaa-0000-4000-8000-000000000001', '{"profile": {"city": "X"}}') $$,
   'a suspended alumnus cannot edit their profile'),
  ('11111111-1111-4111-8111-000000000010', $$ select public.set_my_visibility('aaaaaaaa-0000-4000-8000-000000000001', 'members') $$,
   'a suspended alumnus cannot republish'),
  ('11111111-1111-4111-8111-000000000010', $$ select public.confirm_still_accurate_in_app('aaaaaaaa-0000-4000-8000-000000000001') $$,
   'a suspended alumnus cannot confirm their profile'),
  ('11111111-1111-4111-8111-000000000003', $$ select public.decide_access_request('33333333-3333-4333-8333-000000000001', 'approve') $$,
   'an applicant cannot approve their own request'),
  ('11111111-1111-4111-8111-000000000009', $$ select public.decide_access_request('33333333-3333-4333-8333-000000000002', 'approve') $$,
   'a T applicant cannot approve their own request'),
  ('11111111-1111-4111-8111-000000000012', $$ select public.withdraw_access_request('33333333-3333-4333-8333-000000000002') $$,
   'an applicant cannot withdraw another applicant''s request'),
  ('11111111-1111-4111-8111-000000000011', $$ select public.save_my_profile('aaaaaaaa-0000-4000-8000-000000000001', '{"profile": {"city": "X"}}') $$,
   'an outsider cannot save a profile'),
  ('11111111-1111-4111-8111-000000000011', $$ select public.set_my_visibility('aaaaaaaa-0000-4000-8000-000000000001', 'members') $$,
   'an outsider cannot publish'),
  ('11111111-1111-4111-8111-000000000011', $$ select public.record_consent('aaaaaaaa-0000-4000-8000-000000000001', 'terms', '2026-10') $$,
   'an outsider cannot record consent at a school'),
  ('11111111-1111-4111-8111-000000000011', $$ select public.withdraw_consent('aaaaaaaa-0000-4000-8000-000000000001', 'terms') $$,
   'an outsider cannot withdraw consent at a school'),
  ('11111111-1111-4111-8111-000000000011', $$ select public.export_my_data('aaaaaaaa-0000-4000-8000-000000000001') $$,
   'an outsider has nothing to export'),
  ('11111111-1111-4111-8111-000000000011', $$ select public.delete_my_profile('aaaaaaaa-0000-4000-8000-000000000001') $$,
   'an outsider has nothing to delete'),
  ('11111111-1111-4111-8111-000000000011', $$ select public.reply_to_info_request('33333333-3333-4333-8333-000000000003', 'Hi') $$,
   'an outsider cannot answer someone else''s request'),
  ('11111111-1111-4111-8111-000000000011', $$ select public.decide_access_request('33333333-3333-4333-8333-000000000001', 'approve') $$,
   'an outsider cannot decide requests'),
  ('11111111-1111-4111-8111-000000000011', $$ select public.accept_staff_invitation('guessed-token') $$,
   'a guessed staff invitation token does nothing')
) as t(who, sql, description);

select pg_temp.login('11111111-1111-4111-8111-000000000010');
select ok(
  public.export_my_data('aaaaaaaa-0000-4000-8000-000000000001') ? 'profile',
  'a suspended alumnus can still export their data'
);
reset role;

-- System admin: a grant is read-only; without one, no school RPC works ---------------------------------
select pg_temp.login('11111111-1111-4111-8111-000000000006');
select lives_ok(
  $$ select public.platform_open_grant('aaaaaaaa-0000-4000-8000-000000000001', 'Support ticket 21', 1) $$,
  'a system admin opens a grant on H'
);
reset role;
select pg_temp.refused('11111111-1111-4111-8111-000000000006'::uuid, sql, description) from (values
  ($$ select public.decide_access_request('33333333-3333-4333-8333-000000000001', 'approve') $$,
   'a grant does not allow deciding requests'),
  ($$ select public.set_profile_status('00000000-0000-4000-8000-000000000002', 'suspended', 'Support') $$,
   'a grant does not allow suspending records'),
  ($$ select public.invite_staff('aaaaaaaa-0000-4000-8000-000000000001', 'x@evil.test', 'school_admin') $$,
   'a grant does not allow inviting staff (appointing goes through platform_appoint_school_admin)'),
  ($$ select public.change_staff_role('aaaaaaaa-0000-4000-8000-000000000001', '11111111-1111-4111-8111-000000000004', 'school_admin') $$,
   'a grant does not allow changing staff roles'),
  ($$ select public.save_email_template('aaaaaaaa-0000-4000-8000-000000000001', 'welcome', 'en', 'X', 'Y') $$,
   'a grant does not allow editing email texts'),
  ($$ select public.update_school_settings('aaaaaaaa-0000-4000-8000-000000000001', '{"default_locale": "fr"}') $$,
   'a grant does not allow changing settings'),
  ($$ select public.save_my_profile('aaaaaaaa-0000-4000-8000-000000000001', '{"profile": {"city": "X"}}') $$,
   'a system admin has no profile to save'),
  ($$ select public.initiate_contact('00000000-0000-4000-8000-000000000002', 'email') $$,
   'a grant does not allow revealing contact details'),
  ($$ select public.admin_update_profile('22222222-2222-4222-8222-000000000003', '{"city": "Paris"}') $$,
   'without a grant on T, a system admin cannot edit a T record'),
  ($$ select public.decide_access_request('33333333-3333-4333-8333-000000000002', 'approve') $$,
   'without a grant on T, a system admin cannot decide a T request')
) as t(sql, description);

-- No client writes to a table directly ----------------------------------------------------------------
-- Tried as a school admin, the most privileged client role. Table privileges are per database role, so
-- every signed-in user gets the same answer.
select pg_temp.refused('11111111-1111-4111-8111-000000000001'::uuid, sql, description) from (
  select format('insert into public.%I default values', c.relname) as sql,
         format('a client cannot insert into %s', c.relname) as description, c.relname, 1 as step
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
  union all
  select format('update public.%I set %I = %I', c.relname, a.attname, a.attname),
         format('a client cannot update %s', c.relname), c.relname, 2
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  cross join lateral (select attname from pg_attribute
                      where attrelid = c.oid and attnum > 0 and not attisdropped and attidentity = '' and attgenerated = ''
                      order by attnum limit 1) a
  where n.nspname = 'public' and c.relkind = 'r'
  union all
  select format('delete from public.%I', c.relname), format('a client cannot delete from %s', c.relname), c.relname, 3
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
  order by relname, step
) as t;

select * from finish();
rollback;
