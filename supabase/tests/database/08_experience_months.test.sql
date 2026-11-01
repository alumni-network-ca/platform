-- Roles keep a month as well as a year (the profile editor's month pickers). Same seed ids as 01_isolation.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

create function pg_temp.login(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true),
         set_config('role', 'authenticated', true);
$$;

select pg_temp.login('11111111-1111-4111-8111-000000000002'); -- Herzliah alumnus
select lives_ok($$
  select public.save_my_profile('aaaaaaaa-0000-4000-8000-000000000001', '{"experience": [
    {"job_title": "Developer", "start_year": 2019, "start_month": 3, "end_year": 2023, "end_month": 11},
    {"job_title": "Founder", "start_year": 2024, "start_month": 1, "is_current": true}
  ]}')
$$, 'save_my_profile stores roles with months');
reset role;
select results_eq(
  $$ select job_title, start_year, start_month, end_year, end_month, is_current from public.alumni_experience
     where profile_id = '00000000-0000-4000-8000-000000000001' order by sort_order $$,
  $$ values ('Developer'::text, 2019, 3::smallint, 2023, 11::smallint, false),
            ('Founder'::text, 2024, 1::smallint, null::int, null::smallint, true) $$,
  'the months are saved with their years'
);

select pg_temp.login('11111111-1111-4111-8111-000000000002');
select throws_ok($$
  select public.save_my_profile('aaaaaaaa-0000-4000-8000-000000000001',
    '{"experience": [{"job_title": "X", "start_year": 2019, "start_month": 13}]}')
$$, '23514', null, 'a month must be 1 to 12');
select throws_ok($$
  select public.save_my_profile('aaaaaaaa-0000-4000-8000-000000000001',
    '{"experience": [{"job_title": "X", "end_month": 4}]}')
$$, '23514', null, 'a month needs its year');
reset role;

select * from finish();
rollback;
