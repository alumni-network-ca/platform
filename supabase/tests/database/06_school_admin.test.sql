-- School console read contracts. Owner-computed expectations avoid RLS hiding fixture rows.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
create function pg_temp.login(p_uid uuid) returns void language sql as $$
select set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true), set_config('role', 'authenticated', true);
$$;
create temp table expected as select jsonb_build_object(
'pending', (select count(*) from public.access_requests where institution_id='aaaaaaaa-0000-4000-8000-000000000001' and status='pending'),
'needs_info', (select count(*) from public.access_requests where institution_id='aaaaaaaa-0000-4000-8000-000000000001' and status='needs_info'),
'oldest_pending_at', (select min(created_at) from public.access_requests where institution_id='aaaaaaaa-0000-4000-8000-000000000001' and status='pending'),
'approved_not_published', (select count(*) from public.access_requests r join public.alumni_profiles p on p.id=r.profile_id where r.institution_id='aaaaaaaa-0000-4000-8000-000000000001' and r.status='approved' and p.status='active' and p.published_at is null),
'published', (select count(*) from public.alumni_profiles where institution_id='aaaaaaaa-0000-4000-8000-000000000001' and status='active' and visibility='members' and published_at is not null)) as metrics;
grant select on expected to authenticated;
select pg_temp.login('11111111-1111-4111-8111-000000000001');
select results_eq($$ select public.admin_dashboard('aaaaaaaa-0000-4000-8000-000000000001') $$, $$ select metrics from expected $$, 'dashboard agrees with owner-computed counts');
select is((public.admin_dashboard('aaaaaaaa-0000-4000-8000-000000000001', now()+interval '1 day')->>'pending')::int, (select (metrics->>'pending')::int from expected), 'period does not affect the current queue');
select is((public.admin_dashboard('aaaaaaaa-0000-4000-8000-000000000001', now()+interval '1 day')->>'published')::int, 0, 'period filters publications');
select is((select count(*)::int from public.school_staff('aaaaaaaa-0000-4000-8000-000000000001')), 2, 'active staff only');
select is((select email from public.school_staff('aaaaaaaa-0000-4000-8000-000000000001') where role='school_admin'), 'admin@herzliah.test', 'staff has sign-in email');
select is(public.admin_profile_email('00000000-0000-4000-8000-000000000001'), 'alumni@herzliah.test', 'record sign-in email');
select is((select count(*)::int from public.admin_roster('aaaaaaaa-0000-4000-8000-000000000001', p_limit=>10)), 10, 'roster paginates');
select is((select count(*)::int from public.admin_roster('aaaaaaaa-0000-4000-8000-000000000001', p_query=>'alumni@herzliah.test')), 1, 'roster searches sign-in email');
select ok(exists(select 1 from public.access_request_matches(array['33333333-3333-4333-8333-000000000001']::uuid[]) where not claimed), 'pending request matches an unclaimed record');
select throws_ok($$ select * from public.admin_roster('aaaaaaaa-0000-4000-8000-000000000001',p_state=>'deleted') $$, '22023', null, 'invalid state refused');
select throws_ok($$ select * from public.access_request_matches(array['33333333-3333-4333-8333-000000000001','33333333-3333-4333-8333-000000000002']::uuid[]) $$, '42501', null, 'mixed-school match batches fail closed');
select lives_ok($$ select public.save_email_template('aaaaaaaa-0000-4000-8000-000000000001', 'welcome', 'en', 'Class {graduation_year}', '{onboarding_link}') $$, 'design placeholders accepted');
reset role;
select pg_temp.login('11111111-1111-4111-8111-000000000004');
select lives_ok($$ select public.admin_dashboard('aaaaaaaa-0000-4000-8000-000000000001') $$, 'reviewer reads metrics');
select lives_ok($$ select * from public.audit_people('aaaaaaaa-0000-4000-8000-000000000001') $$, 'reviewer reads audit labels');
select lives_ok($$ select * from public.admin_roster('aaaaaaaa-0000-4000-8000-000000000001') $$, 'reviewer reads roster');
reset role;
insert into public.alumni_profiles(institution_id,user_id,first_name,last_name,grad_year) values ('aaaaaaaa-0000-4000-8000-000000000001','11111111-1111-4111-8111-000000000001','Rachel','School',2002);
insert into public.access_requests(institution_id,user_id,email,first_name,last_name,grad_year,status) values ('aaaaaaaa-0000-4000-8000-000000000001','11111111-1111-4111-8111-000000000004','reviewer@herzliah.test','Avi','Reviewer',2001,'withdrawn');
insert into public.audit_log(institution_id,actor_user_id,actor_kind,action) values ('aaaaaaaa-0000-4000-8000-000000000001','11111111-1111-4111-8111-000000000006','system_admin','test.support_label');
select pg_temp.login('11111111-1111-4111-8111-000000000001');
select is((select name from public.school_staff('aaaaaaaa-0000-4000-8000-000000000001') where role='school_admin'), 'Rachel School', 'staff name comes from their own school profile');
select is((select name from public.school_staff('aaaaaaaa-0000-4000-8000-000000000001') where role='reviewer'), 'Avi Reviewer', 'staff without a profile use their school request name');
select is((select label from public.audit_people('aaaaaaaa-0000-4000-8000-000000000001') where kind='support'), 'Platform support', 'support labels never reveal an email');
select throws_ok($$ select * from public.access_request_matches(array['33333333-3333-4333-8333-000000000001','99999999-9999-4999-8999-999999999999']::uuid[]) $$, '42501', null, 'missing and inaccessible match IDs have the same error');
reset role;
select * from finish();
rollback;
