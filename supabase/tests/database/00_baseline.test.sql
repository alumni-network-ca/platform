-- Baseline access guards for the legacy schema. Run with `npm run test:db` (needs `supabase start`).
-- FND-06 replaces this with the full two-tenant x every-role isolation suite.
-- Known findings are written as TODO tests: they report "not ok # TODO" without failing the suite,
-- and start passing (and should become normal tests) once the fixing issue lands.
begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

-- Structure ---------------------------------------------------------------------------------------
select has_table('public', 'institutions', 'institutions table exists');
select has_table('public', 'alumni_profiles', 'alumni_profiles table exists');

select is(
  (select count(*)::int from pg_tables where schemaname = 'public' and not rowsecurity),
  0,
  'row level security is enabled on every public table'
);

select is(
  (select count(*)::int from public.alumni_profiles where id::text like '00000000-0000-4000-8000-%'),
  50,
  'the 50 demo alumni are seeded'
);

-- Anonymous visitors see nothing -----------------------------------------------------------------
set local role anon;
select is_empty('select id from public.alumni_profiles', 'anon cannot read alumni profiles');
select is_empty('select id from public.institution_memberships', 'anon cannot read memberships');
reset role;

-- A signed-up user without a membership (pending) sees no directory data --------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-4111-8111-000000000003", "role": "authenticated", "email": "pending@herzliah.test"}';
select is_empty('select id from public.alumni_profiles', 'a pending user cannot read alumni profiles');
reset role;

-- An alumnus sees the directory, but not hidden or unclaimed records -------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-4111-8111-000000000002", "role": "authenticated", "email": "alumni@herzliah.test"}';
select isnt_empty(
  $$ select id from public.alumni_profiles where id::text like '00000000-0000-4000-8000-%' $$,
  'an alumnus can read published profiles of their institution'
);
select is_empty(
  $$ select id from public.alumni_profiles where id::text like '22222222-2222-4222-8222-%' $$,
  'an alumnus cannot read hidden or unclaimed profiles'
);

select todo_start('F3: members can read private columns such as claim_email (fixed by FND-05)');
select is_empty(
  $$ select claim_email from public.alumni_profiles
     where claim_email is not null and user_id is distinct from auth.uid() $$,
  'an alumnus cannot read other alumni''s claim email'
);
select todo_end();

select todo_start('F4: child tables do not check the parent profile''s visibility (fixed by FND-05)');
select is_empty(
  $$ select id from public.alumni_experience where profile_id = '22222222-2222-4222-8222-000000000002' $$,
  'an alumnus cannot read the work history of a hidden profile'
);
select todo_end();
reset role;

-- Staff can see records that are not yet claimed -------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-4111-8111-000000000001", "role": "authenticated", "email": "admin@herzliah.test"}';
select isnt_empty(
  $$ select id from public.alumni_profiles where id = '22222222-2222-4222-8222-000000000001' $$,
  'an administrator can read unclaimed imported records'
);
reset role;

select * from finish();
rollback;
