-- Two schools x every role: who can read what (docs/architecture/data-model.md §5, FND-06).
-- Seed ids: schools H = aaaaaaaa-…01 (herzliah), T = aaaaaaaa-…02 (test-school).
-- Users 11111111-…01 school admin H, …02 alumnus H, …03 pending applicant H, …04 reviewer H, …05 alumnus T,
-- …06 system admin, …07 school admin T, …08 reviewer T, …09 pending applicant T, …10 suspended alumnus H,
-- …11 verified account with no school, …12/13/14 H requests in needs_info / rejected / withdrawn,
-- …15 approved H alumnus who has not finished onboarding.
-- Profiles 00000000-…001 to …200 demo H (published), …201 to …220 demo T (published), 22222222-…01 unclaimed H,
-- …02 hidden H, …03 published T (owned by …05), …04 suspended H (owned by …10), …05 not onboarded H (…15).
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

create function pg_temp.login(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true),
         set_config('role', 'authenticated', true);
$$;

insert into public.audit_log (institution_id, actor_kind, action)
values ('aaaaaaaa-0000-4000-8000-000000000001', 'system', 'test.entry');

-- Anonymous visitors ----------------------------------------------------------------------------------
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select throws_ok($$ select id from public.alumni_profiles $$, '42501', null, 'anon cannot read profiles');
select throws_ok($$ select id from public.institutions $$, '42501', null, 'anon cannot read schools');
select is(public.public_school('herzliah') ->> 'name', 'Herzliah High School', 'anon reads the public school card');
select is(public.public_school('nope'), null, 'an unknown school returns nothing');
select throws_ok(
  $$ select public.request_access('aaaaaaaa-0000-4000-8000-000000000001', 'A', 'B', null, 2000, null) $$,
  '42501', null, 'anon cannot submit an access request'
);
reset role;

-- Pending applicant (H) -------------------------------------------------------------------------------
select pg_temp.login('11111111-1111-4111-8111-000000000003');
select is_empty('select id from public.alumni_profiles', 'a pending applicant sees no profiles');
select is_empty('select id from public.profile_contact_channels', 'a pending applicant sees no contact channels');
select is_empty('select id from public.institutions', 'a pending applicant is not a member of any school');
select is((select count(*)::int from public.access_requests), 1, 'a pending applicant sees their own request');
select is(
  (select count(*)::int from public.search_directory('aaaaaaaa-0000-4000-8000-000000000001')),
  0, 'a pending applicant gets no directory results'
);
select throws_ok(
  $$ select public.initiate_contact('00000000-0000-4000-8000-000000000002', 'email') $$,
  '42501', null, 'a pending applicant cannot reveal contact details'
);
reset role;

-- Alumnus (H) -----------------------------------------------------------------------------------------
select pg_temp.login('11111111-1111-4111-8111-000000000002');
select is((select count(*)::int from public.alumni_profiles), 200, 'an alumnus sees the 200 published profiles of their school');
select is_empty(
  $$ select id from public.alumni_profiles where id::text like '22222222-%' $$,
  'an alumnus sees no hidden, unclaimed, suspended or other-school profiles'
);
select is(
  (select count(*)::int from public.alumni_private), 1,
  'an alumnus reads only their own private row (F3)'
);
select is_empty(
  $$ select id from public.profile_contact_channels where type in ('email', 'phone')
     and profile_id <> '00000000-0000-4000-8000-000000000001' $$,
  'an alumnus cannot read other members'' email or phone (F3)'
);
select isnt_empty(
  $$ select id from public.profile_contact_channels where type = 'linkedin' and profile_id = '00000000-0000-4000-8000-000000000002' $$,
  'an alumnus reads public link channels of published profiles'
);
select is_empty(
  $$ select id from public.alumni_experience where profile_id = '22222222-2222-4222-8222-000000000002' $$,
  'an alumnus cannot read the work history of a hidden profile (F4)'
);
select is_empty(
  $$ select id from public.profile_contact_channels where profile_id = '22222222-2222-4222-8222-000000000002' $$,
  'an alumnus cannot read the channels of a hidden profile (F4)'
);
select is((select count(*)::int from public.institution_memberships), 1, 'an alumnus sees only their own membership');
select results_eq(
  'select id from public.access_requests',
  $$ values ('33333333-3333-4333-8333-000000000006'::uuid) $$,
  'an alumnus reads only their own access request'
);
select is_empty('select id from public.audit_log', 'an alumnus cannot read the audit log');
select is((select count(*)::int from public.email_templates), 16, 'an alumnus sees only the platform default texts');
select is(
  (select max(total_count)::int from public.search_directory('aaaaaaaa-0000-4000-8000-000000000001')),
  200, 'the directory search returns the 200 published profiles'
);
select is(
  (select count(*)::int from public.search_directory('aaaaaaaa-0000-4000-8000-000000000002')),
  0, 'the directory search of another school returns nothing'
);
select is(
  public.initiate_contact('00000000-0000-4000-8000-000000000002', 'email'),
  'maya.frenkel@example.test', 'an alumnus reveals a published email one profile at a time'
);
select is(
  public.initiate_contact('00000000-0000-4000-8000-000000000002', 'email'),
  'maya.frenkel@example.test', 'a repeat reveal still works'
);
select is((select count(*)::int from public.contact_events), 1, 'a repeat reveal within 24 h logs one contact event');
select throws_ok(
  $$ select public.initiate_contact('22222222-2222-4222-8222-000000000002', 'email') $$,
  '42501', null, 'a hidden profile''s email cannot be revealed'
);
select throws_ok(
  $$ select public.initiate_contact('22222222-2222-4222-8222-000000000003', 'email') $$,
  '42501', null, 'another school''s email cannot be revealed'
);
reset role;

-- Alumnus (T) -----------------------------------------------------------------------------------------
select pg_temp.login('11111111-1111-4111-8111-000000000005');
select is((select count(*)::int from public.alumni_profiles), 21, 'an alumnus of test-school sees its 21 published profiles');
select is_empty(
  $$ select id from public.alumni_profiles where institution_id <> 'aaaaaaaa-0000-4000-8000-000000000002' $$,
  'an alumnus of test-school sees only their school'
);
select is_empty(
  $$ select id from public.alumni_education where institution_id = 'aaaaaaaa-0000-4000-8000-000000000001' $$,
  'an alumnus of test-school sees nothing of herzliah'
);
reset role;

-- Reviewer (H) ----------------------------------------------------------------------------------------
select pg_temp.login('11111111-1111-4111-8111-000000000004');
select is((select count(*)::int from public.alumni_profiles), 205, 'a reviewer sees every herzliah record, hidden and suspended ones included');
select is((select count(*)::int from public.alumni_private where institution_id = 'aaaaaaaa-0000-4000-8000-000000000002'), 0,
  'a reviewer sees no private data of another school');
select is((select count(*)::int from public.access_requests), 6, 'a reviewer sees every herzliah request, in every state');
select isnt_empty('select id from public.audit_log', 'a reviewer reads the audit log');
select is(
  (select count(*)::int from public.search_directory('aaaaaaaa-0000-4000-8000-000000000001')),
  0, 'staff without an alumni profile cannot browse the directory'
);
select is((select count(*)::int from public.email_templates), 16, 'a reviewer cannot read the school''s templates');
select throws_ok(
  $$ select public.admin_update_profile('00000000-0000-4000-8000-000000000002', '{"city": "Paris"}') $$,
  '42501', null, 'a reviewer cannot edit records'
);
select throws_ok(
  $$ select public.invite_staff('aaaaaaaa-0000-4000-8000-000000000001', 'x@herzliah.test', 'reviewer') $$,
  '42501', null, 'a reviewer cannot invite staff'
);
reset role;

-- School admin (H) ------------------------------------------------------------------------------------
select pg_temp.login('11111111-1111-4111-8111-000000000001');
select is((select count(*)::int from public.alumni_profiles), 205, 'a school admin sees every herzliah record');
select is_empty(
  $$ select id from public.alumni_profiles where institution_id = 'aaaaaaaa-0000-4000-8000-000000000002' $$,
  'a school admin sees nothing of another school'
);
select is((select count(*)::int from public.email_templates), 32, 'a school admin reads the defaults and the school''s templates');
select throws_ok(
  $$ select public.admin_update_profile('22222222-2222-4222-8222-000000000003', '{"city": "Paris"}') $$,
  '42501', null, 'a school admin cannot edit another school''s record'
);
select throws_ok(
  $$ select public.platform_create_school('Evil', 'evil') $$,
  '42501', null, 'a school admin cannot create schools'
);
reset role;

-- Staff of test-school (T) ---------------------------------------------------------------------------
select pg_temp.login('11111111-1111-4111-8111-000000000007');
select is((select count(*)::int from public.alumni_profiles), 21, 'the test-school admin sees every test-school record');
select is_empty(
  $$ select id from public.alumni_profiles where institution_id = 'aaaaaaaa-0000-4000-8000-000000000001' $$,
  'the test-school admin sees nothing of herzliah'
);
select results_eq(
  'select id from public.access_requests order by id',
  $$ values ('33333333-3333-4333-8333-000000000002'::uuid), ('33333333-3333-4333-8333-000000000007'::uuid) $$,
  'the test-school admin sees only test-school requests'
);
select is_empty(
  $$ select id from public.audit_log where institution_id = 'aaaaaaaa-0000-4000-8000-000000000001' $$,
  'the test-school admin cannot read herzliah''s audit log'
);
select is_empty(
  $$ select profile_id from public.alumni_private where institution_id = 'aaaaaaaa-0000-4000-8000-000000000001' $$,
  'the test-school admin cannot read herzliah''s private data'
);
reset role;
select pg_temp.login('11111111-1111-4111-8111-000000000008');
select is((select count(*)::int from public.access_requests), 2, 'the test-school reviewer sees only test-school requests');
select is_empty(
  $$ select id from public.institution_memberships where institution_id = 'aaaaaaaa-0000-4000-8000-000000000001' $$,
  'the test-school reviewer cannot list herzliah''s members'
);
reset role;

-- Pending applicant (T) -------------------------------------------------------------------------------
select pg_temp.login('11111111-1111-4111-8111-000000000009');
select is_empty('select id from public.alumni_profiles', 'a pending applicant at test-school sees no profiles');
select results_eq(
  'select id from public.access_requests',
  $$ values ('33333333-3333-4333-8333-000000000002'::uuid) $$,
  'a pending applicant sees only their own request'
);
reset role;

-- Suspended alumnus (H) -------------------------------------------------------------------------------
select pg_temp.login('11111111-1111-4111-8111-000000000010');
select is_empty('select id from public.institutions', 'a suspended alumnus is not an active member of any school');
select is_empty(
  $$ select id from public.alumni_profiles where id <> '22222222-2222-4222-8222-000000000004' $$,
  'a suspended alumnus sees no other profile'
);
select is(
  (select count(*)::int from public.search_directory('aaaaaaaa-0000-4000-8000-000000000001')),
  0, 'a suspended alumnus gets no directory results'
);
select throws_ok(
  $$ select public.initiate_contact('00000000-0000-4000-8000-000000000002', 'email') $$,
  '42501', null, 'a suspended alumnus cannot reveal contact details'
);
reset role;
select pg_temp.login('11111111-1111-4111-8111-000000000002');
select is_empty(
  $$ select id from public.alumni_profiles where id = '22222222-2222-4222-8222-000000000004' $$,
  'other alumni do not see a suspended record'
);
reset role;

-- Verified account with no school ---------------------------------------------------------------------
select pg_temp.login('11111111-1111-4111-8111-000000000011');
select is_empty('select id from public.institutions', 'an outsider sees no school');
select is_empty('select id from public.alumni_profiles', 'an outsider sees no profiles');
select is_empty('select id from public.access_requests', 'an outsider sees no requests');
select is_empty('select id from public.email_outbox', 'an outsider sees no outgoing email');
select is(
  (select count(*)::int from public.search_directory('aaaaaaaa-0000-4000-8000-000000000001')),
  0, 'an outsider gets no directory results'
);
reset role;

-- System admin ----------------------------------------------------------------------------------------
select pg_temp.login('11111111-1111-4111-8111-000000000006');
select is((select count(*)::int from public.institutions), 2, 'a system admin sees every school');
select is_empty('select id from public.alumni_profiles', 'a system admin has no standing access to alumni data');
select throws_ok(
  $$ select public.platform_open_grant('aaaaaaaa-0000-4000-8000-000000000001', 'Support ticket 12', 9) $$,
  '22023', null, 'a grant cannot last more than 8 hours'
);
select lives_ok(
  $$ select public.platform_open_grant('aaaaaaaa-0000-4000-8000-000000000001', 'Support ticket 12', 1) $$,
  'a system admin opens a 1-hour grant'
);
select is((select count(*)::int from public.alumni_profiles), 205, 'with a grant, a system admin reads that school''s records');
select is_empty(
  $$ select id from public.alumni_profiles where institution_id = 'aaaaaaaa-0000-4000-8000-000000000002' $$,
  'the grant covers only that school'
);
select throws_ok(
  $$ select public.admin_update_profile('00000000-0000-4000-8000-000000000002', '{"city": "Paris"}') $$,
  '42501', null, 'a grant is read-only'
);
reset role;
select is(
  (select actor_kind from public.audit_log where action = 'platform.grant_opened'),
  'system_admin', 'opening a grant is audited as a system admin action'
);

-- A grant stops working when it expires (FND-13). now() is fixed inside a transaction, so the grant is moved
-- into the past instead of waiting for it.
update public.platform_access_grants
set created_at = now() - interval '2 hours', expires_at = now() - interval '1 minute'
where user_id = '11111111-1111-4111-8111-000000000006';
select pg_temp.login('11111111-1111-4111-8111-000000000006');
select is_empty('select id from public.alumni_profiles', 'an expired grant gives no access');
select is_empty('select profile_id from public.alumni_private', 'nor to private data');
select is_empty('select id from public.access_requests', 'nor to access requests');
select lives_ok(
  $$ select set_config('test.grant',
       public.platform_open_grant('aaaaaaaa-0000-4000-8000-000000000001', 'Support ticket 13', 2)::text, true) $$,
  'a system admin opens a new grant'
);
select is((select count(*)::int from public.alumni_profiles), 205, 'the new grant gives access again');
select lives_ok($$ select public.platform_revoke_grant(current_setting('test.grant')::uuid) $$, 'and revokes it early');
select is_empty('select id from public.alumni_profiles', 'a revoked grant gives no access');
reset role;

select pg_temp.login('11111111-1111-4111-8111-000000000001');
select throws_ok($$ select * from public.school_staff('aaaaaaaa-0000-4000-8000-000000000002') $$, '42501', null, 'school console reader 1 refuses the other school');
select throws_ok($$ select * from public.audit_people('aaaaaaaa-0000-4000-8000-000000000002') $$, '42501', null, 'school console reader 2 refuses the other school');
select throws_ok($$ select public.admin_dashboard('aaaaaaaa-0000-4000-8000-000000000002') $$, '42501', null, 'school console reader 3 refuses the other school');
select throws_ok($$ select * from public.admin_roster('aaaaaaaa-0000-4000-8000-000000000002') $$, '42501', null, 'school console reader 4 refuses the other school');
select throws_ok($$ select public.admin_profile_email('22222222-2222-4222-8222-000000000003') $$, '42501', null, 'school console reader 5 refuses the other school');
select throws_ok($$ select * from public.access_request_matches(array['33333333-3333-4333-8333-000000000002']::uuid[]) $$, '42501', null, 'school console reader 6 refuses the other school');
reset role;
select * from finish();
rollback;
