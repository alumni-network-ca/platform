-- Write paths: the sign-up → approval → onboarding → publish journey, staff, templates and freshness.
-- Same seed ids as 01_isolation.test.sql.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

create function pg_temp.login(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true),
         set_config('role', 'authenticated', true);
$$;

-- Sign-up and approval ---------------------------------------------------------------------------------
select pg_temp.login('11111111-1111-4111-8111-000000000003');
select lives_ok(
  $$ select public.request_access('aaaaaaaa-0000-4000-8000-000000000001', 'Penny', 'Pending', 'Levi', 2012, 'Updated note') $$,
  'resubmitting updates the open request'
);
select is((select count(*)::int from public.access_requests), 1, 'there is still only one open request');
reset role;

select pg_temp.login('11111111-1111-4111-8111-000000000002');
select throws_ok(
  $$ select public.decide_access_request('33333333-3333-4333-8333-000000000001', 'approve') $$,
  '42501', null, 'an alumnus cannot decide access requests'
);
reset role;

select pg_temp.login('11111111-1111-4111-8111-000000000004');
select throws_ok(
  $$ select public.decide_access_request('33333333-3333-4333-8333-000000000001', 'needs_info', '  ') $$,
  '22023', null, 'asking for more information needs a question'
);
select isnt(
  public.decide_access_request('33333333-3333-4333-8333-000000000001', 'approve'),
  null, 'a reviewer approves the request and a profile is created'
);
select throws_ok(
  $$ select public.decide_access_request('33333333-3333-4333-8333-000000000001', 'reject', 'no') $$,
  '22023', null, 'a decided request cannot be decided again'
);
reset role;

select is(
  (select role::text || '/' || status::text from public.institution_memberships
   where user_id = '11111111-1111-4111-8111-000000000003'),
  'alumni/active', 'approval creates an active alumni membership'
);
select is(
  (select maiden_name from public.alumni_private p join public.alumni_profiles a on a.id = p.profile_id
   where a.user_id = '11111111-1111-4111-8111-000000000003'),
  'Levi', 'the maiden name goes to the private table'
);
select is(
  (select status::text || '/' || locale::text from public.email_outbox
   where template_key = 'access_approved' and to_email = 'pending@herzliah.test'),
  'queued/en', 'the approval email is queued in the school''s language'
);
select isnt_empty(
  $$ select 1 from public.audit_log where action = 'access_request.approve' and actor_kind = 'member' $$,
  'the approval is audited'
);

-- Onboarding and publishing (as the newly approved user) -----------------------------------------------
select pg_temp.login('11111111-1111-4111-8111-000000000003');
select is(
  (select visibility::text from public.alumni_profiles where user_id = auth.uid()),
  'hidden', 'a new profile starts hidden (F13)'
);
select throws_ok(
  $$ select public.save_my_profile('aaaaaaaa-0000-4000-8000-000000000001',
       '{"channels": [{"type": "phone", "value": "555-1234", "is_public": true}]}') $$,
  '23514', null, 'an invalid phone number is rejected'
);
select lives_ok(
  $$ select public.save_my_profile('aaaaaaaa-0000-4000-8000-000000000001', '{
       "profile": {"city": "Montreal", "country": "Canada", "job_title": "Architect", "languages": ["en", "fr", " "],
                   "onboarding_step": 7, "onboarding_completed": true},
       "channels": [{"type": "linkedin", "value": "https://www.linkedin.com/in/penny", "is_public": true},
                    {"type": "email", "value": "penny@example.test", "is_public": false}],
       "education": [{"school": "McGill University", "degree": "BArch", "graduation_year": 2016}],
       "experience": [{"job_title": "Architect", "employer": "Studio", "is_current": true}],
       "offers": ["mentoring", "networking", "not_an_offer"]}') $$,
  'save_my_profile saves every section in one call'
);
select is(
  (select array_length(languages, 1) from public.alumni_profiles where user_id = auth.uid()),
  2, 'blank languages are dropped'
);
select is(
  (select count(*)::int from public.profile_offers po join public.alumni_profiles p on p.id = po.profile_id
   where p.user_id = auth.uid()),
  2, 'unknown offers are ignored'
);
select is(
  (select source::text from public.profile_confirmations c join public.alumni_profiles p on p.id = c.profile_id
   where p.user_id = auth.uid()),
  'onboarding', 'completing onboarding counts as the first confirmation'
);
select ok(
  (select confirmation_due_at > now() + interval '11 months' from public.alumni_profiles where user_id = auth.uid()),
  'the next confirmation is due in 12 months'
);
select throws_ok(
  $$ select public.set_my_visibility('aaaaaaaa-0000-4000-8000-000000000001', 'members') $$,
  '22023', null, 'publishing needs consent'
);
select lives_ok(
  $$ select public.record_consent('aaaaaaaa-0000-4000-8000-000000000001', 'directory_publication', '2026-10') $$,
  'consent is recorded'
);
select lives_ok(
  $$ select public.set_my_visibility('aaaaaaaa-0000-4000-8000-000000000001', 'members') $$,
  'the alumnus publishes their profile'
);
select throws_ok(
  $$ select public.save_my_profile('aaaaaaaa-0000-4000-8000-000000000002', '{"profile": {"city": "X"}}') $$,
  '42501', null, 'an alumnus cannot save a profile at another school'
);
select throws_ok(
  $$ select public.record_consent('aaaaaaaa-0000-4000-8000-000000000002', 'terms', '2026-10') $$,
  '42501', null, 'consent can only be recorded at a school the user belongs to or applied to'
);
reset role;
select is(
  (select count(*)::int from public.email_outbox where template_key = 'welcome' and to_email = 'pending@herzliah.test'),
  1, 'the first publication queues the welcome email'
);

-- A second save counts as a confirmation and supersedes an open confirmation request (DEC-06).
insert into public.confirmation_requests (institution_id, profile_id, due_at)
select institution_id, id, now() from public.alumni_profiles where user_id = '11111111-1111-4111-8111-000000000003';
select pg_temp.login('11111111-1111-4111-8111-000000000003');
select lives_ok(
  $$ select public.save_my_profile('aaaaaaaa-0000-4000-8000-000000000001', '{"profile": {"bio": "Hello"}}') $$,
  'a later save'
);
reset role;
select is(
  (select c.status from public.confirmation_requests c join public.alumni_profiles p on p.id = c.profile_id
   where p.user_id = '11111111-1111-4111-8111-000000000003'),
  'superseded', 'saving the profile supersedes the open confirmation request'
);

-- Confirmation by email link -------------------------------------------------------------------------
insert into public.confirmation_requests (id, institution_id, profile_id, due_at)
values ('44444444-4444-4444-8444-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', now());
select set_config('test.token', public.mint_token('confirmation_request', '44444444-4444-4444-8444-000000000001'), true);
set local role anon;
select ok(public.confirm_still_accurate(current_setting('test.token')), 'the POST with the emailed token confirms');
select ok(not public.confirm_still_accurate(current_setting('test.token')), 'a used token does nothing');
select ok(not public.confirm_still_accurate('guess'), 'a guessed token does nothing');
reset role;
select is(
  (select source::text from public.profile_confirmations where profile_id = '00000000-0000-4000-8000-000000000001'),
  'alumnus_still_accurate', 'the confirmation is recorded with its source'
);

-- Staff edits never count as confirmation (E5) ---------------------------------------------------------
select pg_temp.login('11111111-1111-4111-8111-000000000001');
select lives_ok(
  $$ select public.admin_update_profile('00000000-0000-4000-8000-000000000002', '{"city": "Paris", "admin_notes": "Moved"}') $$,
  'a school admin edits a record'
);
reset role;
select is(
  (select count(*)::int from public.profile_confirmations where profile_id = '00000000-0000-4000-8000-000000000002'),
  0, 'a staff edit records no confirmation'
);
select is(
  (select admin_notes from public.alumni_private where profile_id = '00000000-0000-4000-8000-000000000002'),
  'Moved', 'private fields are updated'
);

-- Record status -------------------------------------------------------------------------------------
select pg_temp.login('11111111-1111-4111-8111-000000000001');
select throws_ok(
  $$ select public.set_profile_status('00000000-0000-4000-8000-000000000001', 'suspended') $$,
  '22023', null, 'suspending needs a reason'
);
select lives_ok(
  $$ select public.set_profile_status('00000000-0000-4000-8000-000000000001', 'suspended', 'Reported abuse') $$,
  'a school admin suspends a record'
);
reset role;
select is(
  (select status::text from public.institution_memberships where user_id = '11111111-1111-4111-8111-000000000002'),
  'suspended', 'suspending the record suspends the alumni membership'
);
select pg_temp.login('11111111-1111-4111-8111-000000000002');
select is_empty('select id from public.profile_contact_channels where type = ''linkedin'' and profile_id <> ''00000000-0000-4000-8000-000000000001''',
  'a suspended alumnus loses directory access on the next request');
reset role;

-- Staff management ----------------------------------------------------------------------------------
select pg_temp.login('11111111-1111-4111-8111-000000000001');
select throws_ok(
  $$ select public.change_staff_role('aaaaaaaa-0000-4000-8000-000000000001', '11111111-1111-4111-8111-000000000001', 'reviewer') $$,
  '22023', null, 'the last school admin cannot demote themselves'
);
select throws_ok(
  $$ select public.remove_staff('aaaaaaaa-0000-4000-8000-000000000001', '11111111-1111-4111-8111-000000000001') $$,
  '22023', null, 'the last school admin cannot remove themselves'
);
select lives_ok(
  $$ select public.invite_staff('aaaaaaaa-0000-4000-8000-000000000001', 'Pending@Herzliah.test', 'reviewer') $$,
  'a school admin invites a reviewer'
);
reset role;
select set_config('test.staff_token',
  (select public.mint_token('staff_invitation', id) from public.staff_invitations where email = 'pending@herzliah.test'), true);
select pg_temp.login('11111111-1111-4111-8111-000000000002');
select throws_ok(
  $$ select public.accept_staff_invitation(current_setting('test.staff_token')) $$,
  '42501', null, 'an invitation only works for the invited email'
);
reset role;
select pg_temp.login('11111111-1111-4111-8111-000000000003');
select lives_ok(
  $$ select public.accept_staff_invitation(current_setting('test.staff_token')) $$,
  'the invited person accepts'
);
reset role;
select is(
  (select role::text from public.institution_memberships where user_id = '11111111-1111-4111-8111-000000000003'),
  'reviewer', 'the invitee becomes a reviewer'
);
select pg_temp.login('11111111-1111-4111-8111-000000000001');
select lives_ok(
  $$ select public.remove_staff('aaaaaaaa-0000-4000-8000-000000000001', '11111111-1111-4111-8111-000000000003') $$,
  'a school admin removes the reviewer'
);
reset role;
select is(
  (select role::text || '/' || status::text from public.institution_memberships where user_id = '11111111-1111-4111-8111-000000000003'),
  'alumni/active', 'a removed staff member who is an approved alumnus stays an alumnus'
);

-- Email templates (DEC-06) --------------------------------------------------------------------------
select pg_temp.login('11111111-1111-4111-8111-000000000001');
select throws_ok(
  $$ select public.save_email_template('aaaaaaaa-0000-4000-8000-000000000001', 'welcome', 'en', 'Hi', '<b>Hi</b>') $$,
  '22023', null, 'HTML is rejected'
);
select throws_ok(
  $$ select public.save_email_template('aaaaaaaa-0000-4000-8000-000000000001', 'welcome', 'en', 'Hi', 'Hi {password}') $$,
  '22023', null, 'unknown placeholders are rejected'
);
select lives_ok(
  $$ select public.save_email_template('aaaaaaaa-0000-4000-8000-000000000001', 'welcome', 'en', 'Welcome!', 'Hi {first_name}') $$,
  'a school admin saves a draft'
);
select lives_ok(
  $$ select public.approve_email_template('aaaaaaaa-0000-4000-8000-000000000001', 'welcome', 'en') $$,
  'and approves it'
);
select is(
  (select subject from public.email_templates
   where institution_id = 'aaaaaaaa-0000-4000-8000-000000000001' and key = 'welcome' and locale = 'en' and status = 'approved'),
  'Welcome!', 'the approved version is replaced'
);
reset role;
select pg_temp.login('11111111-1111-4111-8111-000000000004');
select throws_ok(
  $$ select public.save_email_template('aaaaaaaa-0000-4000-8000-000000000001', 'welcome', 'en', 'X', 'Y') $$,
  '42501', null, 'a reviewer cannot edit templates'
);
reset role;
select is(public.resolve_email_template('aaaaaaaa-0000-4000-8000-000000000002', 'access_approved', 'fr'), null,
  'a school with no approved template sends nothing');
select is(public.resolve_email_template('aaaaaaaa-0000-4000-8000-000000000002', 'staff_invitation', 'fr')::text, 'fr',
  'staff invitations fall back to the platform default');
insert into public.email_templates (institution_id, key, locale, status, subject, body)
values ('aaaaaaaa-0000-4000-8000-000000000002', 'access_approved', 'en', 'approved', 'Welcome', 'Hi {first_name}');
select is(public.resolve_email_template('aaaaaaaa-0000-4000-8000-000000000002', 'access_approved', 'fr')::text, 'en',
  'a missing language falls back to the other approved language');

-- Self-service rights ----------------------------------------------------------------------------------
select pg_temp.login('11111111-1111-4111-8111-000000000005');
select ok(public.export_my_data('aaaaaaaa-0000-4000-8000-000000000002') ? 'profile', 'an alumnus exports their data');
select lives_ok($$ select public.delete_my_profile('aaaaaaaa-0000-4000-8000-000000000002') $$, 'an alumnus deletes their profile');
select is_empty('select id from public.institutions', 'after deletion the membership is revoked');
reset role;
select is(
  (select status::text || '/' || visibility::text from public.alumni_profiles where id = '22222222-2222-4222-8222-000000000003'),
  'deleted/hidden', 'the deleted profile is hidden until the purge'
);

-- System admin -----------------------------------------------------------------------------------------
select pg_temp.login('11111111-1111-4111-8111-000000000006');
select isnt(public.platform_create_school('Third School', 'third-school', 'fr'), null, 'a system admin creates a school');
select lives_ok(
  $$ select public.platform_appoint_school_admin((select id from public.institutions where slug = 'third-school'), 'head@third.test') $$,
  'and invites its first school admin'
);
reset role;
select is(
  (select status::text || '/' || locale::text from public.email_outbox where to_email = 'head@third.test'),
  'queued/fr', 'the first admin''s invitation is queued in the school''s language'
);

select * from finish();
rollback;
