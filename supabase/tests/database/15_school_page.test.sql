-- School page (SCH-01, ADR 0022): school admins write their own school's page, its alumni read it, links are https only.
-- Same seed ids as 01_isolation.test.sql: H = Herzliah (…0001), T = the other school (…0002).
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

create function pg_temp.login(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true),
         set_config('role', 'authenticated', true);
$$;

select is((select count(*)::int from public.school_pages), 0, 'a school starts with no page');

-- Who may write ---------------------------------------------------------------------------------------------
select pg_temp.login('11111111-1111-4111-8111-000000000002'); -- H alumnus
select throws_ok(
  $$ select public.set_school_page('aaaaaaaa-0000-4000-8000-000000000001', '{"website_url": "https://example.org"}') $$,
  '42501', null, 'an alumnus cannot write the page'
);
select throws_ok(
  $$ insert into public.school_pages (institution_id, website_url) values ('aaaaaaaa-0000-4000-8000-000000000001', 'https://example.org') $$,
  '42501', null, 'nor insert into the table directly'
);
reset role;

select pg_temp.login('11111111-1111-4111-8111-000000000004'); -- H reviewer
select throws_ok(
  $$ select public.set_school_page('aaaaaaaa-0000-4000-8000-000000000001', '{"website_url": "https://example.org"}') $$,
  '42501', null, 'a reviewer cannot write the page'
);
reset role;

select pg_temp.login('11111111-1111-4111-8111-000000000007'); -- T school admin
select throws_ok(
  $$ select public.set_school_page('aaaaaaaa-0000-4000-8000-000000000001', '{"website_url": "https://example.org"}') $$,
  '42501', null, 'another school''s admin cannot write it'
);
reset role;

-- A school admin writes -------------------------------------------------------------------------------------
select pg_temp.login('11111111-1111-4111-8111-000000000001'); -- H school admin
select lives_ok(
  $$ select public.set_school_page('aaaaaaaa-0000-4000-8000-000000000001', '{}') $$,
  'an empty page is valid'
);
select lives_ok(
  $$ select public.set_school_page('aaaaaaaa-0000-4000-8000-000000000001', '{
       "website_url": "https://www.herzliah.example", "donate_url": " https://give.example/herzliah ",
       "social_links": {"instagram": "https://instagram.com/herzliah", "x": "https://x.com/herzliah"},
       "about_en": "A school.", "about_fr": "Une école.", "address": "5 Main St, Montreal",
       "map_url": "https://maps.example/herzliah", "office_name": "Alumni Office",
       "office_email": " Alumni@Herzliah.Example ", "office_phone": "514-555-0100", "ignored": "x"}') $$,
  'a school admin saves the full page'
);
select is(
  (select donate_url from public.school_pages where institution_id = 'aaaaaaaa-0000-4000-8000-000000000001'),
  'https://give.example/herzliah', 'values are trimmed'
);
select is(
  (select office_email from public.school_pages where institution_id = 'aaaaaaaa-0000-4000-8000-000000000001'),
  'alumni@herzliah.example', 'the office email is lower-cased'
);
select lives_ok(
  $$ select public.set_school_page('aaaaaaaa-0000-4000-8000-000000000001', '{"website_url": "https://www.herzliah.example"}') $$,
  'saving again replaces the page'
);
select is(
  (select donate_url from public.school_pages where institution_id = 'aaaaaaaa-0000-4000-8000-000000000001'),
  null, 'a field left out is cleared'
);
reset role;

-- Links must be https, with no credentials ------------------------------------------------------------------
select pg_temp.login('11111111-1111-4111-8111-000000000001');
select throws_ok(
  $$ select public.set_school_page('aaaaaaaa-0000-4000-8000-000000000001', '{"donate_url": "javascript:alert(1)"}') $$,
  '23514', null, 'a javascript: link is refused'
);
select throws_ok(
  $$ select public.set_school_page('aaaaaaaa-0000-4000-8000-000000000001', '{"website_url": "http://www.herzliah.example"}') $$,
  '23514', null, 'a plain http link is refused'
);
select throws_ok(
  $$ select public.set_school_page('aaaaaaaa-0000-4000-8000-000000000001', '{"map_url": "https://user:pw@maps.example/x"}') $$,
  '23514', null, 'a link with credentials is refused'
);
select throws_ok(
  $$ select public.set_school_page('aaaaaaaa-0000-4000-8000-000000000001', '{"social_links": {"myspace": "https://myspace.example/x"}}') $$,
  '23514', null, 'an unknown social network is refused'
);
select throws_ok(
  $$ select public.set_school_page('aaaaaaaa-0000-4000-8000-000000000001', '{"social_links": {"x": "ftp://x.example/a"}}') $$,
  '23514', null, 'a social link must be https'
);
select throws_ok(
  $$ select public.set_school_page('aaaaaaaa-0000-4000-8000-000000000001', '{"office_email": "not an email"}') $$,
  '23514', null, 'a bad office email is refused'
);
reset role;

-- Who reads -------------------------------------------------------------------------------------------------
select pg_temp.login('11111111-1111-4111-8111-000000000002'); -- H alumnus
select is((select count(*)::int from public.school_pages), 1, 'an alumnus reads their own school''s page');
select is(
  (select count(*)::int from public.school_pages where institution_id = 'aaaaaaaa-0000-4000-8000-000000000002'),
  0, 'and never another school''s'
);
reset role;

select pg_temp.login('11111111-1111-4111-8111-000000000005'); -- T alumnus
select is((select count(*)::int from public.school_pages), 0, 'an alumnus of the other school sees nothing of it');
reset role;

select pg_temp.login('11111111-1111-4111-8111-000000000003'); -- H pending applicant
select is((select count(*)::int from public.school_pages), 0, 'a pending applicant reads no page');
reset role;

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select throws_ok($$ select * from public.school_pages $$, '42501', null, 'anon cannot read pages');
reset role;

-- Audit -----------------------------------------------------------------------------------------------------
select ok(
  exists (select 1 from public.audit_log where action = 'school.page_updated'
          and institution_id = 'aaaaaaaa-0000-4000-8000-000000000001'),
  'every save writes an audit row'
);

select * from finish();
rollback;
