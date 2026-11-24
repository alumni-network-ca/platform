-- Staff invitation flow (docs/design/staff-invite.md §6): the link preview, Resend restarting the 7 days, the
-- invitee lookup and staff names from sign-up. Same seed ids as 01_isolation.test.sql.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

create function pg_temp.login(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true),
         set_config('role', 'authenticated', true);
$$;
create function pg_temp.anon() returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true),
         set_config('role', 'anon', true);
$$;

-- Herzliah's school admin invites the outsider as a reviewer.
select pg_temp.login('11111111-1111-4111-8111-000000000001');
select set_config('test.invitation', public.invite_staff(
  'aaaaaaaa-0000-4000-8000-000000000001', 'Outsider@AlumniNetwork.test', 'reviewer')::text, true);
reset role;
-- An invitation two days from expiring: a new link restarts the 7 days.
update public.staff_invitations set expires_at = now() + interval '2 days'
where id = current_setting('test.invitation')::uuid;
select pg_temp.login('11111111-1111-4111-8111-000000000001');
select set_config('test.old_token', public.issue_staff_invitation_link(current_setting('test.invitation')::uuid), true);
select set_config('test.token', public.issue_staff_invitation_link(current_setting('test.invitation')::uuid), true);
reset role;
select ok(
  (select expires_at > now() + interval '6 days 23 hours' from public.staff_invitations
   where id = current_setting('test.invitation')::uuid),
  'a new link restarts the 7 days'
);

-- Preview, signed out --------------------------------------------------------------------------------------
select pg_temp.anon();
select is(
  (select status || '/' || role::text || '/' || email from public.staff_invitation_preview(current_setting('test.token'))),
  'open/reviewer/outsider@alumninetwork.test',
  'a signed-out visitor with the link sees an open invitation, its role and the invited address'
);
select is(
  (select institution_id from public.staff_invitation_preview(current_setting('test.token'))),
  'aaaaaaaa-0000-4000-8000-000000000001'::uuid, 'and its school'
);
select is(
  (select status from public.staff_invitation_preview(current_setting('test.old_token'))),
  'invalid', 'a replaced link reads as unknown'
);
select is(
  (select array[status, coalesce(email, '-'), coalesce(institution_id::text, '-')]
   from public.staff_invitation_preview(repeat('a', 64))),
  array['invalid', '-', '-'], 'an unknown token shows nothing else'
);
select is(
  (select status from public.staff_invitation_preview('not a token')), 'invalid', 'nor does a malformed one'
);
select throws_ok($$ select public.my_staff_invitation('aaaaaaaa-0000-4000-8000-000000000001') $$, '42501', null,
  'a signed-out visitor cannot look up invitations');
reset role;

-- The invitee lookup -----------------------------------------------------------------------------------------
select pg_temp.login('11111111-1111-4111-8111-000000000011');
select is(public.my_staff_invitation('aaaaaaaa-0000-4000-8000-000000000001'), 'reviewer'::public.member_role,
  'the invited person sees their open invitation at that school');
select is(public.my_staff_invitation('aaaaaaaa-0000-4000-8000-000000000002'), null,
  'and none at another school');
reset role;
select pg_temp.login('11111111-1111-4111-8111-000000000002');
select is(public.my_staff_invitation('aaaaaaaa-0000-4000-8000-000000000001'), null,
  'someone else sees no invitation');
reset role;

-- Accepting, and the name given at sign-up -----------------------------------------------------------------
update auth.users set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
  || '{"first_name": "Claire", "last_name": "Roy"}'::jsonb
where id = '11111111-1111-4111-8111-000000000011';
select pg_temp.login('11111111-1111-4111-8111-000000000011');
select is(public.accept_staff_invitation(current_setting('test.token')), 'aaaaaaaa-0000-4000-8000-000000000001'::uuid,
  'the invited person accepts');
select is(public.my_staff_invitation('aaaaaaaa-0000-4000-8000-000000000001'), null,
  'and no longer has an open invitation');
reset role;
select pg_temp.anon();
select ok(
  (select status = 'accepted' and ended_at is not null from public.staff_invitation_preview(current_setting('test.token'))),
  'the link now reads as accepted'
);
reset role;
select pg_temp.login('11111111-1111-4111-8111-000000000001');
select is(
  (select name from public.school_staff('aaaaaaaa-0000-4000-8000-000000000001')
   where user_id = '11111111-1111-4111-8111-000000000011'),
  'Claire Roy', 'the staff list shows the name given at sign-up'
);
select is(
  (select label from public.audit_people('aaaaaaaa-0000-4000-8000-000000000001')
   where user_id = '11111111-1111-4111-8111-000000000011'),
  'Claire Roy', 'and so does the audit log'
);

-- Revoked and expired --------------------------------------------------------------------------------------
select set_config('test.revoked', public.invite_staff(
  'aaaaaaaa-0000-4000-8000-000000000001', 'revoked@herzliah.test', 'reviewer')::text, true);
select set_config('test.revoked_token', public.issue_staff_invitation_link(current_setting('test.revoked')::uuid), true);
select lives_ok($$ select public.revoke_staff_invitation(current_setting('test.revoked')::uuid) $$, 'an admin revokes one');
select set_config('test.expired', public.invite_staff(
  'aaaaaaaa-0000-4000-8000-000000000001', 'expired@herzliah.test', 'school_admin')::text, true);
select set_config('test.expired_token', public.issue_staff_invitation_link(current_setting('test.expired')::uuid), true);
reset role;
update public.staff_invitations set expires_at = now() - interval '1 minute'
where id = current_setting('test.expired')::uuid;
select pg_temp.anon();
select is((select status from public.staff_invitation_preview(current_setting('test.revoked_token'))), 'revoked',
  'a revoked link reads as revoked');
select is((select status from public.staff_invitation_preview(current_setting('test.expired_token'))), 'expired',
  'an expired link reads as expired');
reset role;
select pg_temp.login('11111111-1111-4111-8111-000000000001');
select throws_ok($$ select public.issue_staff_invitation_link(current_setting('test.expired')::uuid) $$, '22023', null,
  'an expired invitation gets no new link: the admin sends a new invitation instead');
reset role;

-- Accepting without the link, by the confirmed email (ADR 0016) ----------------------------------------------
-- Test School's admin invites the outsider, who has no role there, as a school admin.
select pg_temp.login('11111111-1111-4111-8111-000000000007');
select set_config('test.mine', public.invite_staff(
  'aaaaaaaa-0000-4000-8000-000000000002', 'outsider@alumninetwork.test', 'school_admin')::text, true);
reset role;

select pg_temp.anon();
select throws_ok($$ select * from public.my_staff_invitation_preview('aaaaaaaa-0000-4000-8000-000000000002') $$,
  '42501', null, 'a signed-out visitor cannot read an invitation by email');
select throws_ok($$ select public.accept_my_staff_invitation('aaaaaaaa-0000-4000-8000-000000000002') $$,
  '42501', null, 'nor accept one');
reset role;

select pg_temp.login('11111111-1111-4111-8111-000000000011');
select is(
  (select role::text || '/' || email || '/' || inviter_name
   from public.my_staff_invitation_preview('aaaaaaaa-0000-4000-8000-000000000002')),
  'school_admin/outsider@alumninetwork.test/admin@test-school.test',
  'the invited person sees their open invitation, its role and who sent it'
);
select ok(
  (select expires_at > now() and invited_at <= now()
   from public.my_staff_invitation_preview('aaaaaaaa-0000-4000-8000-000000000002')),
  'and its dates'
);
select is((select count(*)::int from public.my_staff_invitation_preview('aaaaaaaa-0000-4000-8000-000000000001')), 0,
  'and nothing at a school where they already accepted');
select throws_ok($$ select public.accept_my_staff_invitation('aaaaaaaa-0000-4000-8000-000000000001') $$,
  '42501', null, 'where there is nothing left to accept');
reset role;

select pg_temp.login('11111111-1111-4111-8111-000000000002');
select is((select count(*)::int from public.my_staff_invitation_preview('aaaaaaaa-0000-4000-8000-000000000002')), 0,
  'someone else sees no invitation by email');
select throws_ok($$ select public.accept_my_staff_invitation('aaaaaaaa-0000-4000-8000-000000000002') $$,
  '42501', null, 'and cannot accept it');
reset role;

-- An address that isn't confirmed proves nothing.
update auth.users set email_confirmed_at = null where id = '11111111-1111-4111-8111-000000000011';
select pg_temp.login('11111111-1111-4111-8111-000000000011');
select throws_ok($$ select public.accept_my_staff_invitation('aaaaaaaa-0000-4000-8000-000000000002') $$,
  '42501', null, 'an unconfirmed email cannot accept');
reset role;
update auth.users set email_confirmed_at = now() where id = '11111111-1111-4111-8111-000000000011';

select pg_temp.login('11111111-1111-4111-8111-000000000011');
select is(public.accept_my_staff_invitation('aaaaaaaa-0000-4000-8000-000000000002'),
  'aaaaaaaa-0000-4000-8000-000000000002'::uuid, 'the invited person accepts by their confirmed email');
select is(public.my_staff_invitation('aaaaaaaa-0000-4000-8000-000000000002'), null,
  'and no longer has an open invitation there');
select throws_ok($$ select public.accept_my_staff_invitation('aaaaaaaa-0000-4000-8000-000000000002') $$,
  '42501', null, 'an accepted invitation cannot be accepted again');
reset role;
select is(
  (select role::text || '/' || status::text from public.institution_memberships
   where institution_id = 'aaaaaaaa-0000-4000-8000-000000000002' and user_id = '11111111-1111-4111-8111-000000000011'),
  'school_admin/active', 'they get the invited role'
);
select is(
  (select array_agg(action order by created_at) from public.audit_log
   where target_id = current_setting('test.mine') and action = 'staff.joined'),
  array['staff.joined'], 'and one staff.joined audit row'
);

-- Expired and revoked invitations can't be accepted by email either.
select pg_temp.login('11111111-1111-4111-8111-000000000007');
select set_config('test.mine_expired', public.invite_staff(
  'aaaaaaaa-0000-4000-8000-000000000002', 'pending@test-school.test', 'reviewer')::text, true);
select set_config('test.mine_revoked', public.invite_staff(
  'aaaaaaaa-0000-4000-8000-000000000002', 'reviewer@herzliah.test', 'reviewer')::text, true);
select lives_ok($$ select public.revoke_staff_invitation(current_setting('test.mine_revoked')::uuid) $$,
  'the admin revokes an invitation');
reset role;
update public.staff_invitations set expires_at = now() - interval '1 minute'
where id = current_setting('test.mine_expired')::uuid;
select pg_temp.login('11111111-1111-4111-8111-000000000009');
select throws_ok($$ select public.accept_my_staff_invitation('aaaaaaaa-0000-4000-8000-000000000002') $$,
  '42501', null, 'an expired invitation cannot be accepted by email');
reset role;
select pg_temp.login('11111111-1111-4111-8111-000000000004');
select throws_ok($$ select public.accept_my_staff_invitation('aaaaaaaa-0000-4000-8000-000000000002') $$,
  '42501', null, 'nor a revoked one');
reset role;

-- Accepting a reviewer invitation never demotes an active school admin.
select pg_temp.login('11111111-1111-4111-8111-000000000007');
select set_config('test.mine_demote', public.invite_staff(
  'aaaaaaaa-0000-4000-8000-000000000002', 'admin@test-school.test', 'reviewer')::text, true);
select lives_ok($$ select public.accept_my_staff_invitation('aaaaaaaa-0000-4000-8000-000000000002') $$,
  'a school admin accepts a reviewer invitation by email');
reset role;
select is(
  (select role::text from public.institution_memberships
   where institution_id = 'aaaaaaaa-0000-4000-8000-000000000002' and user_id = '11111111-1111-4111-8111-000000000007'),
  'school_admin', 'and stays a school admin'
);

select * from finish();
rollback;
