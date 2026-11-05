-- ONB-09: the optional student ID on the access request, as a matching hint for reviewers. Same seed ids as
-- 01_isolation.test.sql. The unclaimed herzliah record 22…01 and test-school's 22…03 both hold the ID H10042.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

create function pg_temp.login(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true),
         set_config('role', 'authenticated', true);
$$;

-- Normal form ------------------------------------------------------------------------------------------
select is(public.normalize_student_id(' h10-042 '), 'H10042', 'spaces and dashes go, letters are upper case');
select is(public.normalize_student_id(' - '), null, 'an empty ID is null');
select throws_ok(
  $$ update public.alumni_private set school_student_id = 'h 1' where profile_id = '22222222-2222-4222-8222-000000000002' $$,
  '23514', null, 'a stored ID is always in normal form'
);

-- Applicant ----------------------------------------------------------------------------------------------
select pg_temp.login('11111111-1111-4111-8111-000000000003');
select lives_ok(
  $$ select public.request_access('aaaaaaaa-0000-4000-8000-000000000001', 'Penny', 'Pending', 'Levi', 2000, null, ' h10-042 ') $$,
  'an applicant can give a student ID'
);
select is((select school_student_id from public.access_requests where id = '33333333-3333-4333-8333-000000000001'),
  'H10042', 'the applicant reads back the ID they gave, in normal form');
select throws_ok(
  $$ select public.request_access('aaaaaaaa-0000-4000-8000-000000000001', 'Penny', 'Pending', 'Levi', 2000, null, repeat('9', 41)) $$,
  '22023', null, 'an ID longer than 40 characters is refused'
);
select lives_ok(
  $$ select public.request_access('aaaaaaaa-0000-4000-8000-000000000001', 'Penny', 'Pending', 'Levi', 2000, null, '') $$,
  'leaving the ID blank is fine'
);
select is((select school_student_id from public.access_requests where id = '33333333-3333-4333-8333-000000000001'),
  null, 'a blank ID clears it');
select public.request_access('aaaaaaaa-0000-4000-8000-000000000001', 'Penny', 'Pending', 'Levi', 2000, null, 'h10042');
reset role;

-- Another alumnus never sees it ---------------------------------------------------------------------------
select pg_temp.login('11111111-1111-4111-8111-000000000002');
select is_empty($$ select 1 from public.access_requests where school_student_id is not null $$,
  'another alumnus cannot read an applicant''s student ID');
select is_empty($$ select 1 from public.alumni_private where school_student_id is not null $$,
  'another alumnus cannot read a record''s student ID');
reset role;

-- Reviewer: matching and roster ----------------------------------------------------------------------------
select pg_temp.login('11111111-1111-4111-8111-000000000004');
select results_eq(
  $$ select profile_id, id_match, score, school_student_id
     from public.access_request_matches(array['33333333-3333-4333-8333-000000000001']::uuid[]) limit 1 $$,
  $$ values ('22222222-2222-4222-8222-000000000001'::uuid, true, 1.0::real, 'H10042'::text) $$,
  'the record with the same student ID comes first, even with another graduation year'
);
select is_empty(
  $$ select 1 from public.access_request_matches(array['33333333-3333-4333-8333-000000000001']::uuid[])
     where profile_id = '22222222-2222-4222-8222-000000000003' $$,
  'the same ID at another school never matches'
);
select results_eq(
  $$ select id from public.admin_roster('aaaaaaaa-0000-4000-8000-000000000001', p_query => 'h10 042') $$,
  $$ values ('22222222-2222-4222-8222-000000000001'::uuid) $$,
  'the roster finds a record by its student ID, typed in any form'
);
reset role;

-- Staff edits use the normal form; approval never overwrites an ID staff entered ----------------------------
select pg_temp.login('11111111-1111-4111-8111-000000000001');
select public.admin_update_profile('22222222-2222-4222-8222-000000000001', '{"school_student_id": "h-999"}');
reset role;
select is((select school_student_id from public.alumni_private where profile_id = '22222222-2222-4222-8222-000000000001'),
  'H999', 'a staff edit is stored in normal form');

select pg_temp.login('11111111-1111-4111-8111-000000000004');
select is_empty(
  $$ select 1 from public.access_request_matches(array['33333333-3333-4333-8333-000000000001']::uuid[]) where id_match $$,
  'a different ID is not an ID match'
);
select public.decide_access_request('33333333-3333-4333-8333-000000000001', 'approve', null, '22222222-2222-4222-8222-000000000001');
reset role;
select is((select school_student_id from public.alumni_private where profile_id = '22222222-2222-4222-8222-000000000001'),
  'H999', 'linking keeps the ID staff entered');

-- A new record gets the applicant's ID -------------------------------------------------------------------
select pg_temp.login('11111111-1111-4111-8111-000000000009');
select public.request_access('aaaaaaaa-0000-4000-8000-000000000002', 'Paul', 'Pending', null, 2018, null, 'ts-77');
reset role;
select pg_temp.login('11111111-1111-4111-8111-000000000008');
select set_config('test.paul', public.decide_access_request('33333333-3333-4333-8333-000000000002', 'approve')::text, true);
reset role;
select is((select school_student_id from public.alumni_private where profile_id = current_setting('test.paul')::uuid),
  'TS77', 'approving copies the ID to the new record');

-- An empty linked record gets the applicant's ID -----------------------------------------------------------
update public.alumni_private set school_student_id = null where profile_id = '22222222-2222-4222-8222-000000000001';
update public.alumni_profiles set user_id = null where id = '22222222-2222-4222-8222-000000000001';
select pg_temp.login('11111111-1111-4111-8111-000000000012');
select public.request_access('aaaaaaaa-0000-4000-8000-000000000001', 'Nora', 'Info', null, 2009, null, 'N-1');
reset role;
select pg_temp.login('11111111-1111-4111-8111-000000000004');
select public.decide_access_request('33333333-3333-4333-8333-000000000003', 'approve', null, '22222222-2222-4222-8222-000000000001');
reset role;
select is((select school_student_id from public.alumni_private where profile_id = '22222222-2222-4222-8222-000000000001'),
  'N1', 'linking fills an empty ID');

select * from finish();
rollback;
