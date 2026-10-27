-- Two schools x every role: who can read what (docs/architecture/data-model.md §5, FND-06).
-- Seed ids: schools H = aaaaaaaa-…01 (herzliah), T = aaaaaaaa-…02 (test-school).
-- Users 11111111-…01 school admin H, …02 alumnus H, …03 pending applicant H, …04 reviewer H,
-- …05 alumnus T, …06 system admin. Profiles 00000000-…0xx demo H (published), 22222222-…01 unclaimed H,
-- …02 hidden H, …03 published T.
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
select is((select count(*)::int from public.alumni_profiles), 50, 'an alumnus sees the 50 published profiles of their school');
select is_empty(
  $$ select id from public.alumni_profiles where id::text like '22222222-%' $$,
  'an alumnus sees no hidden, unclaimed or other-school profiles'
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
select is_empty('select id from public.access_requests', 'an alumnus cannot read access requests');
select is_empty('select id from public.audit_log', 'an alumnus cannot read the audit log');
select is((select count(*)::int from public.email_templates), 16, 'an alumnus sees only the platform default texts');
select is(
  (select max(total_count)::int from public.search_directory('aaaaaaaa-0000-4000-8000-000000000001')),
  50, 'the directory search returns the 50 published profiles'
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
select results_eq(
  'select id from public.alumni_profiles',
  $$ values ('22222222-2222-4222-8222-000000000003'::uuid) $$,
  'an alumnus of test-school sees only their school'
);
select is_empty(
  $$ select id from public.alumni_education where institution_id = 'aaaaaaaa-0000-4000-8000-000000000001' $$,
  'an alumnus of test-school sees nothing of herzliah'
);
reset role;

-- Reviewer (H) ----------------------------------------------------------------------------------------
select pg_temp.login('11111111-1111-4111-8111-000000000004');
select is((select count(*)::int from public.alumni_profiles), 52, 'a reviewer sees every herzliah record, hidden ones included');
select is((select count(*)::int from public.alumni_private where institution_id = 'aaaaaaaa-0000-4000-8000-000000000002'), 0,
  'a reviewer sees no private data of another school');
select is((select count(*)::int from public.access_requests), 1, 'a reviewer sees the approval queue');
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
select is((select count(*)::int from public.alumni_profiles), 52, 'a school admin sees every herzliah record');
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
select is((select count(*)::int from public.alumni_profiles), 52, 'with a grant, a system admin reads that school''s records');
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

select * from finish();
rollback;
