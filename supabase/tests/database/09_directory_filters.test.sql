-- Directory and profile pages (DIR-02, DIR-03, CON-02): search_directory's filters, directory_facets and
-- profile_contact_types. The sorts are in 07_directory_sort. Same seed ids as 01_isolation.test.sql.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

create function pg_temp.login(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true),
         set_config('role', 'authenticated', true);
$$;

-- Expected values, read as the table owner over Herzliah's published profiles.
create temp table listed as
select p.id, p.grad_year, p.city from public.alumni_profiles p
where p.institution_id = 'aaaaaaaa-0000-4000-8000-000000000001' and p.status = 'active' and p.visibility = 'members';
grant select on listed to authenticated;
-- Two offers on one published profile, so "all of these" has something to find.
create temp table pair as
select po.profile_id from public.profile_offers po join public.offer_types o on o.id = po.offer_type_id
join listed l on l.id = po.profile_id
group by po.profile_id
having bool_or(o.key = 'mentoring') and bool_or(o.key = 'career_advice');
grant select on pair to authenticated;

-- search_directory ---------------------------------------------------------------------------------------
select pg_temp.login('11111111-1111-4111-8111-000000000002'); -- Herzliah alumnus
select is(
  (select count(*)::int from public.search_directory('aaaaaaaa-0000-4000-8000-000000000001',
     '{"class_from": 1990, "class_to": 1999}', 100)),
  (select count(*)::int from listed where grad_year between 1990 and 1999),
  'a class range keeps only those years'
);
select is(
  (select count(*)::int from public.search_directory('aaaaaaaa-0000-4000-8000-000000000001',
     '{"offers": ["mentoring", "career_advice"]}', 100)),
  (select count(*)::int from pair),
  'several options must all be offered'
);
select ok((select count(*) from pair) > 0, 'the seed has profiles with both options');
select ok(
  (select bool_and(s ilike '%McGill%' or j ilike '%McGill%')
   from (select array_to_string(schools, ' ') as s, coalesce(employer, '') as j
         from public.search_directory('aaaaaaaa-0000-4000-8000-000000000001', '{"q": "mcgill"}', 100)) r),
  'the free-text search also matches universities'
);
select ok(
  (select count(*) from public.search_directory('aaaaaaaa-0000-4000-8000-000000000001', '{"q": "mcgill"}', 100)) > 0,
  'some seeded alumni studied at McGill'
);
reset role;

-- directory_facets -----------------------------------------------------------------------------------------
select pg_temp.login('11111111-1111-4111-8111-000000000002');
select is(
  (public.directory_facets('aaaaaaaa-0000-4000-8000-000000000001') ->> 'total')::int,
  (select count(*)::int from listed),
  'the total counts published profiles only'
);
select is(
  (select sum((d ->> 'count')::int)::int
   from jsonb_array_elements(public.directory_facets('aaaaaaaa-0000-4000-8000-000000000001') -> 'decades') d),
  (select count(*)::int from listed),
  'every published profile falls in one decade'
);
reset role;
-- The seed's hidden member gets a city of its own, which must not be offered.
update public.alumni_profiles set city = 'Secretville' where id = '22222222-2222-4222-8222-000000000002';
select pg_temp.login('11111111-1111-4111-8111-000000000002');
select ok(
  not exists (select 1 from jsonb_array_elements(public.directory_facets('aaaaaaaa-0000-4000-8000-000000000001') -> 'cities') c
              where c ->> 'value' = 'Secretville'),
  'a hidden profile''s city is not offered'
);
reset role;

select pg_temp.login('11111111-1111-4111-8111-000000000005'); -- Test School alumnus
select throws_ok($$ select public.directory_facets('aaaaaaaa-0000-4000-8000-000000000001') $$, '42501', null,
  'another school''s alumnus cannot read the facets');
reset role;
select pg_temp.login('11111111-1111-4111-8111-000000000003'); -- pending applicant at Herzliah
select throws_ok($$ select public.directory_facets('aaaaaaaa-0000-4000-8000-000000000001') $$, '42501', null,
  'an applicant cannot read the facets');
reset role;

-- profile_contact_types ------------------------------------------------------------------------------------
select pg_temp.login('11111111-1111-4111-8111-000000000002');
select is(
  public.profile_contact_types('00000000-0000-4000-8000-000000000002'),
  array['linkedin', 'email']::public.channel_type[],
  'an alumnus sees which channels a published profile shows'
);
select throws_ok($$ select public.profile_contact_types('22222222-2222-4222-8222-000000000002') $$, '42501', null,
  'a hidden profile''s channels are not available');
select throws_ok($$ select public.profile_contact_types('22222222-2222-4222-8222-000000000003') $$, '42501', null,
  'another school''s profile is not available');
reset role;
select pg_temp.login('11111111-1111-4111-8111-000000000003');
select throws_ok($$ select public.profile_contact_types('00000000-0000-4000-8000-000000000002') $$, '42501', null,
  'an applicant cannot see which channels a profile shows');
reset role;

select * from finish();
rollback;
