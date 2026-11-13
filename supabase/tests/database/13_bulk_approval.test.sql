-- ONB-08: school admins approve many access requests at once. Same seed ids as 01_isolation.test.sql.
-- Each request is decided on its own: the clean ones are approved through decide_access_request, everything that
-- needs a human look is skipped with its reason, and one failure never undoes the others.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

create function pg_temp.login(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true),
         set_config('role', 'authenticated', true);
$$;

-- A new account with a pending request at H (or p_inst). Returns the request id.
create function pg_temp.applicant(p_n int, p_first text, p_last text, p_year int, p_sid text default null,
  p_inst uuid default 'aaaaaaaa-0000-4000-8000-000000000001')
returns uuid language plpgsql as $$
declare
  v_uid uuid := ('99999999-9999-4999-8999-' || lpad(p_n::text, 12, '0'))::uuid;
  v_id uuid;
begin
  insert into auth.users (id, aud, role, email, email_confirmed_at)
  values (v_uid, 'authenticated', 'authenticated', 'bulk' || p_n || '@example.test', now());
  insert into public.access_requests (institution_id, user_id, email, first_name, last_name, grad_year, school_student_id)
  values (p_inst, v_uid, 'bulk' || p_n || '@example.test', p_first, p_last, p_year, p_sid)
  returning id into v_id;
  return v_id;
end $$;

-- An approval that raises halfway, after its profile insert would have started: decide_access_request fails for
-- anyone named Boom. Rolled back with the rest of this file.
create function public.test_bulk_boom() returns trigger language plpgsql as $$
begin
  if new.first_name = 'Boom' then raise exception 'boom' using errcode = '23505'; end if;
  return new;
end $$;
create trigger test_bulk_boom before insert on public.alumni_profiles
  for each row execute function public.test_bulk_boom();

select set_config('test.clean1', pg_temp.applicant(1, 'Zephyrine', 'Qwertzova', 1951)::text, true);
select set_config('test.clean2', pg_temp.applicant(2, 'Xanthippe', 'Vlorgson', 1952)::text, true);
select set_config('test.idmatch', pg_temp.applicant(3, 'Ottoline', 'Brumbleby', 1953, 'H10042')::text, true);
select set_config('test.namematch', pg_temp.applicant(4, 'Imported', 'Unclaimed', 2010)::text, true);
select set_config('test.boom', pg_temp.applicant(5, 'Boom', 'Failsworth', 1954)::text, true);
-- The seeded alumnus …02 already has a profile at H.
insert into public.access_requests (institution_id, user_id, email, first_name, last_name, grad_year)
values ('aaaaaaaa-0000-4000-8000-000000000001', '11111111-1111-4111-8111-000000000002', 'again@example.test',
        'Again', 'Twicely', 1955)
returning set_config('test.hasprofile', id::text, true);

create temp table r1 (request_id uuid, outcome text, reason text, profile_id uuid);
create temp table r2 (like r1);
grant all on r1, r2 to authenticated;

-- Who may call it -----------------------------------------------------------------------------------------
select pg_temp.login('11111111-1111-4111-8111-000000000004');
select throws_ok(
  format($$ select * from public.approve_access_requests(array[%L]::uuid[]) $$, current_setting('test.clean1')),
  '42501', null, 'a reviewer cannot approve in bulk'
);
reset role;
select pg_temp.login('11111111-1111-4111-8111-000000000002');
select throws_ok(
  format($$ select * from public.approve_access_requests(array[%L]::uuid[]) $$, current_setting('test.clean1')),
  '42501', null, 'an alumnus cannot approve in bulk'
);
reset role;
select is(
  (select status::text from public.access_requests where id = current_setting('test.clean1')::uuid),
  'pending', 'a refused call changes nothing'
);

-- T's admin gets nothing at H ---------------------------------------------------------------------------------
select pg_temp.login('11111111-1111-4111-8111-000000000007');
select results_eq(
  format($$ select outcome, reason from public.approve_access_requests(array[%L]::uuid[]) $$, current_setting('test.clean1')),
  $$ values ('skipped', 'not_allowed') $$,
  'another school''s admin is told not_allowed'
);
reset role;
select is(
  (select status::text from public.access_requests where id = current_setting('test.clean1')::uuid),
  'pending', 'and the H request stays pending'
);

-- Limits ------------------------------------------------------------------------------------------------------
select pg_temp.login('11111111-1111-4111-8111-000000000001');
select throws_ok(
  $$ select * from public.approve_access_requests((select array_agg(gen_random_uuid()) from generate_series(1, 201))) $$,
  '22023', null, '201 ids are refused'
);
select lives_ok(
  $$ select * from public.approve_access_requests((select array_agg(gen_random_uuid()) from generate_series(1, 200))) $$,
  '200 ids are accepted'
);
select is_empty($$ select * from public.approve_access_requests('{}'::uuid[]) $$, 'an empty list approves nothing');
reset role;

-- One batch, every outcome ----------------------------------------------------------------------------------
select pg_temp.login('11111111-1111-4111-8111-000000000001');
insert into r1 select * from public.approve_access_requests(array[
  current_setting('test.clean1'), current_setting('test.clean2'), current_setting('test.idmatch'),
  current_setting('test.namematch'), current_setting('test.hasprofile'), '33333333-3333-4333-8333-000000000003',
  '33333333-3333-4333-8333-000000000002', 'ffffffff-ffff-4fff-8fff-ffffffffffff', current_setting('test.boom'),
  current_setting('test.clean1')
]::uuid[]);
reset role;

select is((select count(*)::int from r1), 9, 'one result per distinct id');
select results_eq(
  format($$ select r.reason from r1 r join (values (%L::uuid, 1), (%L, 2), (%L, 3), (%L, 4), (%L, 5),
            ('33333333-3333-4333-8333-000000000003', 6), ('33333333-3333-4333-8333-000000000002', 7),
            ('ffffffff-ffff-4fff-8fff-ffffffffffff', 8), (%L, 9)) e(id, n) on e.id = r.request_id order by e.n $$,
         current_setting('test.clean1'), current_setting('test.clean2'), current_setting('test.idmatch'),
         current_setting('test.namematch'), current_setting('test.hasprofile'), current_setting('test.boom')),
  $$ values (null::text), (null), ('possible_match'), ('possible_match'), ('has_profile'), ('not_pending'),
            ('not_allowed'), ('not_allowed'), ('failed') $$,
  'clean requests approve; a match, a profile, a decided, a foreign, an unknown and a failing request are skipped'
);
select is(
  (select array_agg(outcome order by outcome) from r1 where reason is null),
  array['approved', 'approved'], 'the two clean requests are approved'
);
select ok(
  (select bool_and(profile_id is not null) from r1 where outcome = 'approved')
    and (select bool_and(profile_id is null) from r1 where outcome = 'skipped'),
  'approved rows carry the new profile id, skipped rows none'
);

-- Approved exactly as decide_access_request does -------------------------------------------------------------
select is(
  (select count(*)::int from public.alumni_profiles p join r1 on r1.profile_id = p.id
   join public.access_requests a on a.id = r1.request_id
   where p.user_id = a.user_id and p.first_name = a.first_name and p.grad_year = a.grad_year),
  2, 'each approval created the person''s profile'
);
select is(
  (select count(*)::int from public.institution_memberships m join public.access_requests a on a.user_id = m.user_id
   where a.id in (current_setting('test.clean1')::uuid, current_setting('test.clean2')::uuid)
     and m.institution_id = a.institution_id and m.role = 'alumni' and m.status = 'active'),
  2, 'each approved person is an active alumnus'
);
select is(
  (select count(*)::int from public.access_requests
   where id in (current_setting('test.clean1')::uuid, current_setting('test.clean2')::uuid)
     and status = 'approved' and decided_by = '11111111-1111-4111-8111-000000000001'),
  2, 'the requests are approved by the admin who ran the batch'
);
select is(
  (select count(*)::int from public.email_outbox
   where subject_id in (current_setting('test.clean1')::uuid, current_setting('test.clean2')::uuid)
     and template_key = 'access_approved'),
  2, 'each approved person gets one approval email'
);

-- Skipped ones are untouched --------------------------------------------------------------------------------
select is(
  (select array_agg(status::text order by id) from public.access_requests
   where id in (current_setting('test.idmatch')::uuid, current_setting('test.namematch')::uuid,
                current_setting('test.hasprofile')::uuid, current_setting('test.boom')::uuid,
                '33333333-3333-4333-8333-000000000002')),
  array['pending', 'pending', 'pending', 'pending', 'pending'],
  'skipped pending requests stay pending, at both schools'
);
select is_empty(
  format($$ select 1 from public.alumni_profiles p join auth.users u on u.id = p.user_id where u.email = 'bulk5@example.test' $$),
  'the failed approval left no profile behind'
);
select is_empty(
  format($$ select 1 from public.email_outbox where subject_id = %L $$, current_setting('test.boom')),
  'and no email'
);
select is(
  (select status::text from public.access_requests where id = '33333333-3333-4333-8333-000000000003'),
  'needs_info', 'a request waiting on the applicant is not approved'
);

-- Audit: one row per approval and one for the batch --------------------------------------------------------
select is(
  (select count(*)::int from public.audit_log where action = 'access_request.approve'
   and target_id in (current_setting('test.clean1'), current_setting('test.clean2'))),
  2, 'each approval is audited on its own'
);
select is_empty(
  format($$ select 1 from public.audit_log where target_id = %L $$, current_setting('test.boom')),
  'the failed approval wrote no audit row'
);
select results_eq(
  $$ select institution_id, actor_user_id, target_type, metadata from public.audit_log
     where action = 'access_request.bulk_approve' $$,
  $$ values ('aaaaaaaa-0000-4000-8000-000000000001'::uuid, '11111111-1111-4111-8111-000000000001'::uuid,
             'access_request_batch', '{"requested": 7, "approved": 2, "skipped": 5}'::jsonb) $$,
  'one batch row at H, with who ran it and the counts (foreign and unknown ids are not counted)'
);

-- A retry sends nobody a second email ------------------------------------------------------------------------
select pg_temp.login('11111111-1111-4111-8111-000000000001');
insert into r2 select * from public.approve_access_requests(
  array[current_setting('test.clean1'), current_setting('test.clean2')]::uuid[]);
reset role;
select is(
  (select array_agg(reason) from r2), array['not_pending', 'not_pending'],
  'retrying the batch skips what was already approved'
);
select is(
  (select count(*)::int from public.email_outbox
   where subject_id in (current_setting('test.clean1')::uuid, current_setting('test.clean2')::uuid)),
  2, 'still exactly one approval email each'
);

-- The queue's suggestions use the same rules -----------------------------------------------------------------
select pg_temp.login('11111111-1111-4111-8111-000000000001');
select results_eq(
  format($$ select profile_id, id_match from public.access_request_matches(array[%L]::uuid[]) $$,
         current_setting('test.idmatch')),
  $$ values ('22222222-2222-4222-8222-000000000001'::uuid, true) $$,
  'access_request_matches still finds the student-ID match'
);
reset role;
select ok(
  not has_function_privilege('authenticated', 'public.access_request_match_rows(uuid[])', 'execute'),
  'clients cannot call the match helper directly'
);
select ok(
  exists (select 1 from public.role_permissions where role = 'school_admin' and permission = 'requests.bulkapprove')
    and not exists (select 1 from public.role_permissions where role <> 'school_admin' and permission = 'requests.bulkapprove'),
  'only school admins hold requests.bulkapprove'
);

select * from finish();
rollback;
