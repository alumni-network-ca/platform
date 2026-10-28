-- Platform console functions (SA-01, SA-02): system admins only, counts only, and the staff invitation link.
-- Same seed ids as 01_isolation.test.sql.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

create function pg_temp.login(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true),
         set_config('role', 'authenticated', true);
$$;

-- Nobody but a system admin -----------------------------------------------------------------------------
select pg_temp.login('11111111-1111-4111-8111-000000000001'); -- Herzliah's school admin
select throws_ok($$ select * from public.platform_school_summaries() $$, '42501', null,
  'a school admin cannot read the per-school counts');
select throws_ok($$ select * from public.platform_admin_emails() $$, '42501', null,
  'a school admin cannot list platform admins');
select throws_ok($$ select public.platform_set_school_status('aaaaaaaa-0000-4000-8000-000000000001', 'suspended', 'No') $$,
  '42501', null, 'a school admin cannot suspend their own school');
select throws_ok($$ select public.platform_create_school('Mine', 'mine') $$, '42501', null,
  'a school admin cannot create a school');
reset role;

-- Counts ------------------------------------------------------------------------------------------------
-- Expected values are read as the table owner: a system admin cannot read sign-ups through RLS (ADR 0005).
create temp table expected_counts as
select i.slug,
  (select count(*)::int from public.institution_memberships m
   where m.institution_id = i.id and m.status = 'active' and m.role = 'alumni') as members,
  (select count(*)::int from public.access_requests r where r.institution_id = i.id and r.status = 'pending') as pending,
  (select count(*)::int from public.institution_memberships m
   where m.institution_id = i.id and m.status = 'active' and m.role in ('school_admin', 'reviewer')) as staff
from public.institutions i;
grant select on expected_counts to authenticated;
select ok((select sum(pending) from expected_counts) > 0, 'the seed has pending sign-ups to count');

select pg_temp.login('11111111-1111-4111-8111-000000000006');
select results_eq(
  $$ select slug, members::int, pending_requests::int, staff::int from public.platform_school_summaries() order by slug $$,
  $$ select slug, members, pending, staff from expected_counts order by slug $$,
  'a system admin sees each school''s members, pending sign-ups and staff'
);
select results_eq(
  $$ select email from public.platform_admin_emails() $$,
  $$ values ('system@alumninetwork.test'::text) $$,
  'a system admin sees the platform admins'' emails'
);

-- Creating a school with branding -------------------------------------------------------------------------
select isnt(
  public.platform_create_school('Maple Ridge Academy', ' Maple-Ridge ', 'fr', 'office@maple.test',
    '{"short_name": " Maple Ridge ", "primary_color": "#0b2159", "accent_color": "", "unknown": 1}', 'Maple Ridge Alumni'),
  null, 'a system admin creates a school with its branding'
);
select is(
  (select branding from public.institutions where slug = 'maple-ridge'),
  '{"short_name": "Maple Ridge", "primary_color": "#0B2159"}'::jsonb,
  'branding keeps only known keys, trimmed and normalised'
);
select is(
  (select email_display_name from public.institutions where slug = 'maple-ridge'),
  'Maple Ridge Alumni', 'the email sender name is stored'
);
select throws_ok($$ select public.platform_create_school('Console', 'console') $$, '22023', null,
  'an address the platform uses is reserved');
select throws_ok($$ select public.platform_create_school('Again', 'maple-ridge') $$, '23505', null,
  'an address already taken is refused');
select throws_ok($$ select public.platform_create_school('Bad', 'bad-colour', 'en', null, '{"primary_color": "navy"}') $$,
  '22023', null, 'a colour must be a hex value');
select throws_ok($$ select public.platform_create_school('Bad', 'bad-logo', 'en', null, '{"logo": "javascript:alert(1)"}') $$,
  '22023', null, 'a logo must be a site path or an https address');

-- Suspending and reactivating ------------------------------------------------------------------------------
select throws_ok($$ select public.platform_set_school_status('aaaaaaaa-0000-4000-8000-000000000002', 'suspended', '  ') $$,
  '22023', null, 'suspending needs a reason');
select lives_ok($$ select public.platform_set_school_status('aaaaaaaa-0000-4000-8000-000000000002', 'suspended', 'Contract paused') $$,
  'a system admin suspends a school');
select throws_ok($$ select public.platform_set_school_status('aaaaaaaa-0000-4000-8000-000000000002', 'suspended', 'Again') $$,
  '22023', null, 'suspending a suspended school is refused');
reset role;
select is(public.public_school('test-school'), null, 'a suspended school''s address no longer resolves');
select pg_temp.login('11111111-1111-4111-8111-000000000007'); -- Test School's school admin
select ok(not public.has_permission('aaaaaaaa-0000-4000-8000-000000000002', 'records.read'),
  'its staff lose their permissions while it is suspended');
reset role;
select pg_temp.login('11111111-1111-4111-8111-000000000006');
select lives_ok($$ select public.platform_set_school_status('aaaaaaaa-0000-4000-8000-000000000002', 'active') $$,
  'a system admin reactivates it');
reset role;
select isnt(public.public_school('test-school'), null, 'its address resolves again');

-- Staff invitation link -------------------------------------------------------------------------------------
select pg_temp.login('11111111-1111-4111-8111-000000000006');
select set_config('test.invitation', public.platform_appoint_school_admin(
  'aaaaaaaa-0000-4000-8000-000000000002', 'outsider@alumninetwork.test')::text, true);
select set_config('test.old_token', public.issue_staff_invitation_link(current_setting('test.invitation')::uuid), true);
select set_config('test.token', public.issue_staff_invitation_link(current_setting('test.invitation')::uuid), true);
reset role;
select isnt(current_setting('test.old_token'), current_setting('test.token'), 'each link is a new token');

select pg_temp.login('11111111-1111-4111-8111-000000000001'); -- another school's admin
select throws_ok($$ select public.issue_staff_invitation_link(current_setting('test.invitation')::uuid) $$, '42501', null,
  'another school''s admin cannot get the link');
select throws_ok($$ select public.revoke_staff_invitation(current_setting('test.invitation')::uuid) $$, '42501', null,
  'or revoke the invitation');
reset role;

select pg_temp.login('11111111-1111-4111-8111-000000000011'); -- the invited person
select throws_ok($$ select public.accept_staff_invitation(current_setting('test.old_token')) $$, '42501', null,
  'an older link stops working');
select is(public.accept_staff_invitation(current_setting('test.token')), 'aaaaaaaa-0000-4000-8000-000000000002'::uuid,
  'the newest link makes the invited person a school admin');
reset role;
select is(
  (select role::text || '/' || status::text from public.institution_memberships
   where institution_id = 'aaaaaaaa-0000-4000-8000-000000000002' and user_id = '11111111-1111-4111-8111-000000000011'),
  'school_admin/active', 'the membership is active'
);
select pg_temp.login('11111111-1111-4111-8111-000000000006');
select throws_ok($$ select public.issue_staff_invitation_link(current_setting('test.invitation')::uuid) $$, '22023', null,
  'an accepted invitation has no link any more');
select throws_ok($$ select public.revoke_staff_invitation(current_setting('test.invitation')::uuid) $$, '22023', null,
  'and cannot be revoked');
reset role;

-- A school admin manages their own school's invitations
select pg_temp.login('11111111-1111-4111-8111-000000000001');
select set_config('test.reviewer_invitation', public.invite_staff(
  'aaaaaaaa-0000-4000-8000-000000000001', 'new.reviewer@herzliah.test', 'reviewer')::text, true);
select isnt(public.issue_staff_invitation_link(current_setting('test.reviewer_invitation')::uuid), null,
  'a school admin gets the link for their own school''s invitation');
select lives_ok($$ select public.revoke_staff_invitation(current_setting('test.reviewer_invitation')::uuid) $$,
  'and revokes it');
select throws_ok($$ select public.issue_staff_invitation_link(current_setting('test.reviewer_invitation')::uuid) $$, '22023', null,
  'a revoked invitation has no link');
reset role;

select * from finish();
rollback;
