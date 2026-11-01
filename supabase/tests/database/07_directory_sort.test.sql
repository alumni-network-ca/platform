-- search_directory sorts for the alumni home page (DIR-06): recent and random change the order only, never
-- who may be returned. Seed ids as in 01_isolation.test.sql.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

create function pg_temp.login(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true),
         set_config('role', 'authenticated', true);
$$;

-- Spread the publish dates so "recent" has one clear first row.
update public.alumni_profiles p
set published_at = now() - make_interval(days => n.rank::int)
from (select id, row_number() over (order by id) as rank from public.alumni_profiles
      where institution_id = 'aaaaaaaa-0000-4000-8000-000000000001' and published_at is not null) n
where p.id = n.id;

select pg_temp.login('11111111-1111-4111-8111-000000000002');

select is(
  (select id from public.search_directory('aaaaaaaa-0000-4000-8000-000000000001', '{}', 1, 0, 'recent')),
  (select id from public.alumni_profiles
   where institution_id = 'aaaaaaaa-0000-4000-8000-000000000001' and visibility = 'members'
   order by published_at desc nulls last limit 1),
  'recent puts the latest published member first'
);
select ok(
  (select bool_and(published_at is not null)
   from public.search_directory('aaaaaaaa-0000-4000-8000-000000000001', '{}', 100, 0, 'recent')),
  'every directory row carries its publish date'
);
select set_eq(
  $$ select id from public.search_directory('aaaaaaaa-0000-4000-8000-000000000001', '{"grad_year": 2010}', 100, 0, 'random') $$,
  $$ select id from public.search_directory('aaaaaaaa-0000-4000-8000-000000000001', '{"grad_year": 2010}', 100, 0, 'name') $$,
  'random returns the same people as the name sort'
);
select is(
  (select max(total_count)::int
   from public.search_directory('aaaaaaaa-0000-4000-8000-000000000001', '{}', 3, 0, 'random')),
  (select max(total_count)::int
   from public.search_directory('aaaaaaaa-0000-4000-8000-000000000001', '{}', 3, 0, 'name')),
  'random keeps the full count'
);
select is_empty(
  $$ select id from public.search_directory('aaaaaaaa-0000-4000-8000-000000000001', '{}', 100, 0, 'random')
     where id::text like '22222222-%'
     union all
     select id from public.search_directory('aaaaaaaa-0000-4000-8000-000000000001', '{}', 100, 0, 'recent')
     where id::text like '22222222-%' $$,
  'no sort returns hidden, unclaimed, suspended or unfinished profiles'
);
select is(
  (select count(*)::int
   from public.search_directory('aaaaaaaa-0000-4000-8000-000000000002', '{}', 100, 0, 'random')),
  0, 'no sort reaches another school'
);
reset role;

select pg_temp.login('11111111-1111-4111-8111-000000000003');
select is(
  (select count(*)::int
   from public.search_directory('aaaaaaaa-0000-4000-8000-000000000001', '{}', 100, 0, 'recent')),
  0, 'a pending applicant gets nothing from any sort'
);
reset role;

select * from finish();
rollback;
