-- Alumni CSV export (EXP-01): school admins only, the same rows as the roster for the same filters, one audit row.
-- Same seed ids as 06_school_admin.test.sql: ...0001 is Herzliah's school admin, ...0004 its reviewer.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
create function pg_temp.login(p_uid uuid) returns void language sql as $$
select set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true), set_config('role', 'authenticated', true);
$$;

-- Who may export ---------------------------------------------------------------------------------------------
select pg_temp.login('11111111-1111-4111-8111-000000000004');
select throws_ok($$ select * from public.admin_export_alumni('aaaaaaaa-0000-4000-8000-000000000001') $$, '42501', null, 'a reviewer cannot export');
reset role;
select pg_temp.login('11111111-1111-4111-8111-000000000002');
select throws_ok($$ select * from public.admin_export_alumni('aaaaaaaa-0000-4000-8000-000000000001') $$, '42501', null, 'an alumnus cannot export');
reset role;
select pg_temp.login('11111111-1111-4111-8111-000000000001');
select throws_ok($$ select * from public.admin_export_alumni('aaaaaaaa-0000-4000-8000-000000000002') $$, '42501', null, 'a school admin cannot export another school');
select throws_ok($$ select * from public.roster_matches('aaaaaaaa-0000-4000-8000-000000000001', null, null, null, null) $$, '42501', null, 'the filter helper is not callable by clients');

-- Filters ---------------------------------------------------------------------------------------------------
-- The roster pages 100 rows at a time; walk every page so the check holds on a database with more fixtures.
create function pg_temp.roster_ids(p_state text default null, p_min int default null, p_max int default null)
returns setof uuid language sql as $f$
  select r.id from generate_series(0, 100000, 100) o
  cross join lateral public.admin_roster('aaaaaaaa-0000-4000-8000-000000000001', p_state => p_state,
    p_class_min => p_min, p_class_max => p_max, p_limit => 100, p_offset => o) r
$f$;
select is((select count(*)::int from public.admin_export_alumni('aaaaaaaa-0000-4000-8000-000000000001')),
  (select max(total_count)::int from public.admin_roster('aaaaaaaa-0000-4000-8000-000000000001')),
  'with no filters the export has as many rows as the roster total');
select set_eq(
  $$ select id from public.admin_export_alumni('aaaaaaaa-0000-4000-8000-000000000001') $$,
  $$ select pg_temp.roster_ids() $$,
  'with no filters the export has every roster row');
select set_eq(
  $$ select id from public.admin_export_alumni('aaaaaaaa-0000-4000-8000-000000000001', p_state => 'published', p_class_min => 2000, p_class_max => 2015) $$,
  $$ select pg_temp.roster_ids('published', 2000, 2015) $$,
  'status and class filters match the roster');
select ok((select bool_and(state = 'published' and grad_year between 2000 and 2015)
  from public.admin_export_alumni('aaaaaaaa-0000-4000-8000-000000000001', p_state => 'published', p_class_min => 2000, p_class_max => 2015)),
  'filtered rows all meet the filters');
select results_eq(
  $$ select email from public.admin_export_alumni('aaaaaaaa-0000-4000-8000-000000000001', p_query => 'alumni@herzliah.test') $$,
  $$ values ('alumni@herzliah.test') $$,
  'text search matches the roster and the file carries the sign-in email');
select throws_ok($$ select * from public.admin_export_alumni('aaaaaaaa-0000-4000-8000-000000000001', p_state => 'deleted') $$, '22023', null, 'invalid status refused');
select throws_ok($$ select * from public.admin_export_alumni('aaaaaaaa-0000-4000-8000-000000000001', p_class_min => 2010, p_class_max => 2000) $$, '22023', null, 'inverted class range refused');
select is((select count(*)::int from public.admin_roster('aaaaaaaa-0000-4000-8000-000000000001', p_limit => 10)), 10, 'roster still paginates');

-- Audit -----------------------------------------------------------------------------------------------------
select set_config('test.mark', (select coalesce(max(id), 0) from public.audit_log)::text, true);
select count(*) from public.admin_export_alumni('aaaaaaaa-0000-4000-8000-000000000001', p_query => ' alumni@herzliah.test ', p_state => 'published');
reset role;
select results_eq(
  $$ select action, target_type, actor_user_id::text, metadata from public.audit_log where id > current_setting('test.mark')::bigint $$,
  $$ values ('export.alumni', 'institution', '11111111-1111-4111-8111-000000000001',
       '{"format": "csv", "rows": 1, "filters": {"query": "alumni@herzliah.test", "state": "published"}}'::jsonb) $$,
  'an export writes one audit row with its filters and row count');

select * from finish();
rollback;
