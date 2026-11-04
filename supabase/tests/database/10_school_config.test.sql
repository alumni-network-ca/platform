-- school_config: the cached per-school read (lib/tenant/config.ts). Public, one school's rows only, active schools only.
-- And update_school_settings cleans branding before it reaches every page. Same seed ids as 01_isolation.test.sql.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

create function pg_temp.login(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true),
         set_config('role', 'authenticated', true);
$$;

-- Test School gets an option of its own, which Herzliah must not see.
insert into public.career_fields (institution_id, key, label_en, label_fr, sort_order)
values ('aaaaaaaa-0000-4000-8000-000000000002', 'robotics', 'Robotics', 'Robotique', 99);
insert into public.offer_types (institution_id, key, label_en, label_fr, sort_order)
values ('aaaaaaaa-0000-4000-8000-000000000002', 'robot_club', 'Robot club', 'Club de robotique', 99);
create temp table herzliah_config as select public.school_config('aaaaaaaa-0000-4000-8000-000000000001') as config;
create temp table test_school_config as select public.school_config('aaaaaaaa-0000-4000-8000-000000000002') as config;

-- Anyone may read it, signed in or not --------------------------------------------------------------------
set local role anon;
select isnt(public.school_config('aaaaaaaa-0000-4000-8000-000000000001'), null, 'a signed-out visitor reads a school''s config');
reset role;
select pg_temp.login('11111111-1111-4111-8111-000000000002'); -- an alumnus of Herzliah
select isnt(public.school_config('aaaaaaaa-0000-4000-8000-000000000002'), null, 'so does anyone signed in, for any school');
reset role;

-- One school's options plus the platform's ----------------------------------------------------------------
select is(
  (select config -> 'branding' from herzliah_config),
  (select branding from public.institutions where id = 'aaaaaaaa-0000-4000-8000-000000000001'),
  'it returns the school''s branding'
);
select is(
  (select jsonb_array_length(config -> 'career_fields') from herzliah_config),
  (select count(*)::int from public.career_fields where institution_id is null),
  'Herzliah gets the platform career fields only'
);
select ok(
  (select config -> 'career_fields' @> '[{"key": "robotics"}]' from test_school_config)
    and (select config -> 'offer_types' @> '[{"key": "robot_club"}]' from test_school_config),
  'Test School also gets its own career field and networking option'
);
select ok(
  not (select config::text like '%robotics%' or config::text like '%robot_club%' from herzliah_config),
  'Herzliah never gets another school''s options'
);
select is(
  (select count(*)::int from herzliah_config, jsonb_array_elements(config -> 'offer_types') o
   where not (o ? 'id' and o ? 'label_fr' and o ? 'institution_id' and o ? 'is_active' and o ? 'sort_order')),
  0,
  'each option carries what optionsFor and the label helpers read'
);
select is(
  (select config -> 'role_permissions' -> 'reviewer' from herzliah_config),
  (select jsonb_agg(permission order by permission) from public.role_permissions where role = 'reviewer'),
  'it returns the role → permission table'
);

-- Only active schools ----------------------------------------------------------------------------------------
select is(public.school_config('aaaaaaaa-0000-4000-8000-00000000ffff'), null, 'an unknown school has no config');
update public.institutions set status = 'suspended' where id = 'aaaaaaaa-0000-4000-8000-000000000002';
select is(public.school_config('aaaaaaaa-0000-4000-8000-000000000002'), null, 'a suspended school has no config');
update public.institutions set status = 'active' where id = 'aaaaaaaa-0000-4000-8000-000000000002';

-- update_school_settings cleans branding ------------------------------------------------------------------
select pg_temp.login('11111111-1111-4111-8111-000000000001'); -- Herzliah's school admin
select throws_ok(
  $$ select public.update_school_settings('aaaaaaaa-0000-4000-8000-000000000001',
       '{"branding": {"primary_color": "red;} body {display:none"}}') $$,
  '22023', null, 'a school admin cannot store a colour that is not #RRGGBB'
);
select throws_ok(
  $$ select public.update_school_settings('aaaaaaaa-0000-4000-8000-000000000001',
       '{"branding": {"logo": "javascript:alert(1)"}}') $$,
  '22023', null, 'or a logo that is not a site path or an https address'
);
select throws_ok(
  $$ select public.update_school_settings('aaaaaaaa-0000-4000-8000-000000000001',
       '{"branding": {"logo": "//elsewhere.example/logo.png"}}') $$,
  '22023', null, 'or a logo on another site written as //host/…'
);
select throws_ok(
  $$ select public.update_school_settings('aaaaaaaa-0000-4000-8000-000000000001',
       '{"branding": {"favicon": "data:image/png;base64,AAAA"}}') $$,
  '22023', 'the favicon must be a site path or an https address', 'the favicon follows the logo''s rules'
);
select lives_ok(
  $$ select public.update_school_settings('aaaaaaaa-0000-4000-8000-000000000001',
       '{"branding": {"short_name": " Herzliah ", "accent_color": "#7b1e3d", "font": "Comic Sans",
                      "favicon": " /institutes/favicons/herzliah.png "}}') $$,
  'valid branding is saved'
);
reset role;
select is(
  (select branding from public.institutions where id = 'aaaaaaaa-0000-4000-8000-000000000001'),
  '{"short_name": "Herzliah", "accent_color": "#7B1E3D", "favicon": "/institutes/favicons/herzliah.png"}'::jsonb,
  'trimmed and normalised, with unknown keys dropped'
);

select * from finish();
rollback;
