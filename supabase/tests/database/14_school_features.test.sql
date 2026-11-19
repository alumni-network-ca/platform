-- School features (SA-07, PRF-08): only a system admin switches them; Yeshiva / Seminary rows exist only where the
-- feature is on. Same seed ids as 01_isolation.test.sql.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

create function pg_temp.login(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true),
         set_config('role', 'authenticated', true);
$$;

select is(
  (select features from public.institutions where id = 'aaaaaaaa-0000-4000-8000-000000000001'),
  '{}'::jsonb, 'a school starts with no features'
);

-- Only a system admin --------------------------------------------------------------------------------------
select pg_temp.login('11111111-1111-4111-8111-000000000001'); -- Herzliah's school admin
select throws_ok(
  $$ select public.platform_set_school_features('aaaaaaaa-0000-4000-8000-000000000001', '{"yeshiva_seminary": true}') $$,
  '42501', null, 'a school admin cannot switch a feature on'
);
select lives_ok(
  $$ select public.update_school_settings('aaaaaaaa-0000-4000-8000-000000000001', '{"features": {"yeshiva_seminary": true}}') $$,
  'update_school_settings ignores a features key'
);
reset role;
select is(
  (select features from public.institutions where id = 'aaaaaaaa-0000-4000-8000-000000000001'),
  '{}'::jsonb, 'so the school admin did not switch it on'
);

select pg_temp.login('11111111-1111-4111-8111-000000000002'); -- Herzliah alumnus
select throws_ok(
  $$ select public.platform_set_school_features('aaaaaaaa-0000-4000-8000-000000000001', '{"yeshiva_seminary": true}') $$,
  '42501', null, 'an alumnus cannot either'
);
select throws_ok(
  $$ select public.save_my_profile('aaaaaaaa-0000-4000-8000-000000000001', '{"yeshiva": [{"name": "Yeshivat Har Etzion"}]}') $$,
  '42501', null, 'an alumnus cannot save yeshiva rows while the feature is off'
);
reset role;

select pg_temp.login('11111111-1111-4111-8111-000000000006'); -- system admin
select is(
  public.platform_set_school_features('aaaaaaaa-0000-4000-8000-000000000001',
    '{"yeshiva_seminary": true, "unknown": true, "other": "yes"}'),
  '{"yeshiva_seminary": true}'::jsonb, 'a system admin switches it on; unknown keys are dropped'
);
select throws_ok(
  $$ select public.platform_set_school_features('aaaaaaaa-0000-4000-8000-00000000ffff', '{"yeshiva_seminary": true}') $$,
  '22023', null, 'an unknown school is refused'
);
reset role;
select is(
  (select array_agg(action) from public.audit_log
   where institution_id = 'aaaaaaaa-0000-4000-8000-000000000001' and action = 'school.features_updated'),
  array['school.features_updated'], 'the change is audited'
);
select is(
  public.school_config('aaaaaaaa-0000-4000-8000-000000000001') -> 'features',
  '{"yeshiva_seminary": true}'::jsonb, 'school_config hands the features to the app'
);
select is(
  public.school_config('aaaaaaaa-0000-4000-8000-000000000002') -> 'features',
  '{}'::jsonb, 'another school keeps none'
);

-- Saving and reading rows ----------------------------------------------------------------------------------
select pg_temp.login('11111111-1111-4111-8111-000000000002');
select lives_ok($$
  select public.save_my_profile('aaaaaaaa-0000-4000-8000-000000000001', '{"yeshiva": [
    {"name": " Yeshivat Har Etzion ", "location": "Alon Shvut", "start_year": 2006, "end_year": 2007},
    {"name": "Machon Lev", "location": "", "start_year": null, "end_year": null}
  ]}')
$$, 'with the feature on, the alumnus saves yeshiva rows');
select results_eq(
  $$ select name, location, start_year, end_year from public.alumni_yeshiva
     where profile_id = '00000000-0000-4000-8000-000000000001' order by sort_order $$,
  $$ values ('Yeshivat Har Etzion'::text, 'Alon Shvut'::text, 2006, 2007), ('Machon Lev'::text, null::text, null::int, null::int) $$,
  'they are trimmed and kept in order, and the owner reads them'
);
select throws_ok($$
  select public.save_my_profile('aaaaaaaa-0000-4000-8000-000000000001',
    '{"yeshiva": [{"name": "X", "start_year": 2008, "end_year": 2007}]}')
$$, '23514', null, 'the end year cannot come before the start year');
select is(
  (select jsonb_array_length(public.export_my_data('aaaaaaaa-0000-4000-8000-000000000001') -> 'yeshiva')),
  2, 'the data export includes them'
);
select is(
  (select array_agg(id) from public.search_directory('aaaaaaaa-0000-4000-8000-000000000001', '{"q": "har etzion"}')),
  array['00000000-0000-4000-8000-000000000001'::uuid], 'the directory search matches a yeshiva name'
);
select is(
  (select array_agg(id) from public.search_directory('aaaaaaaa-0000-4000-8000-000000000001',
     '{"yeshiva": "yeshivat har etzion"}')),
  array['00000000-0000-4000-8000-000000000001'::uuid], 'and the yeshiva filter finds the alumnus'
);
select ok(
  public.directory_facets('aaaaaaaa-0000-4000-8000-000000000001') -> 'yeshivas'
    @> '[{"value": "Yeshivat Har Etzion", "count": 1}]',
  'the facets list the yeshiva'
);
reset role;

select pg_temp.login('11111111-1111-4111-8111-000000000004'); -- Herzliah reviewer (records.read)
select is((select count(*)::int from public.alumni_yeshiva), 2, 'the school''s staff read them');
reset role;
select pg_temp.login('11111111-1111-4111-8111-000000000005'); -- Test School alumnus
select is((select count(*)::int from public.alumni_yeshiva), 0, 'another school''s alumni never do');
reset role;

-- Switched off: hidden, kept ---------------------------------------------------------------------------------
select pg_temp.login('11111111-1111-4111-8111-000000000006');
select is(
  public.platform_set_school_features('aaaaaaaa-0000-4000-8000-000000000001', '{"yeshiva_seminary": false}'),
  '{"yeshiva_seminary": false}'::jsonb, 'a system admin switches it off'
);
reset role;
select pg_temp.login('11111111-1111-4111-8111-000000000002');
select is((select count(*)::int from public.alumni_yeshiva), 0, 'the rows are hidden, even from their owner');
select is(
  (select count(*)::int from public.search_directory('aaaaaaaa-0000-4000-8000-000000000001', '{"q": "har etzion"}')),
  0, 'the search no longer matches them'
);
select is(
  public.directory_facets('aaaaaaaa-0000-4000-8000-000000000001') -> 'yeshivas', '[]'::jsonb,
  'and the facets list none'
);
reset role;
select is(
  (select count(*)::int from public.alumni_yeshiva where profile_id = '00000000-0000-4000-8000-000000000001'),
  2, 'but they are kept, for when the feature comes back'
);

select * from finish();
rollback;
