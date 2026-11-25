-- School posts (POST-01..POST-05): who writes, who reads what, the https rule, click recording and the notify email.
-- Same seed ids as 01_isolation.test.sql: schools H = aaaaaaaa-…01, T = aaaaaaaa-…02; users 11111111-…01 school
-- admin H, …02 alumnus H, …04 reviewer H, …05 alumnus T, …06 system admin, …07 school admin T, …10 suspended
-- alumnus H, …15 approved H alumnus who has not finished onboarding.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

create function pg_temp.login(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true),
         set_config('role', 'authenticated', true);
$$;

-- A cover image already uploaded to H's folder, and one in T's folder.
insert into storage.objects (bucket_id, name) values
  ('post-covers', 'aaaaaaaa-0000-4000-8000-000000000001/0b1c2d3e-0000-4000-8000-000000000001.jpg'),
  ('post-covers', 'aaaaaaaa-0000-4000-8000-000000000002/0b1c2d3e-0000-4000-8000-000000000002.jpg');

-- Writing --------------------------------------------------------------------------------------------------------
select pg_temp.login('11111111-1111-4111-8111-000000000002'); -- alumnus H
select throws_ok(
  $$ select public.save_post('aaaaaaaa-0000-4000-8000-000000000001', null, 'news', 'Hi', null, null, null, null, null, null) $$,
  '42501', null, 'an alumnus cannot create a post'
);
reset role;
select pg_temp.login('11111111-1111-4111-8111-000000000004'); -- reviewer H
select throws_ok(
  $$ select public.save_post('aaaaaaaa-0000-4000-8000-000000000001', null, 'news', 'Hi', null, null, null, null, null, null) $$,
  '42501', null, 'a reviewer cannot create a post'
);
reset role;
select pg_temp.login('11111111-1111-4111-8111-000000000007'); -- school admin T
select throws_ok(
  $$ select public.save_post('aaaaaaaa-0000-4000-8000-000000000001', null, 'news', 'Hi', null, null, null, null, null, null) $$,
  '42501', null, 'another school''s admin cannot create a post here'
);
reset role;

select pg_temp.login('11111111-1111-4111-8111-000000000001'); -- school admin H
create temp table ids (name text primary key, id uuid);
grant all on ids to authenticated;
insert into ids values ('news', public.save_post('aaaaaaaa-0000-4000-8000-000000000001', null, 'news', 'Robotics lab',
  '{"type": "doc", "content": []}', 'A new lab', null, null, null,
  'aaaaaaaa-0000-4000-8000-000000000001/0b1c2d3e-0000-4000-8000-000000000001.jpg'));
insert into ids values ('fund', public.save_post('aaaaaaaa-0000-4000-8000-000000000001', null, 'fundraising',
  'Library campaign', null, 'Help us renew the library', 'https://give.herzliah.test/library', '$50,000', null, null));
insert into ids values ('draft', public.save_post('aaaaaaaa-0000-4000-8000-000000000001', null, 'news', 'Draft only',
  null, null, null, null, null, null));
select isnt((select id from ids where name = 'news'), null, 'a school admin creates a news post');

select throws_ok(
  $$ select public.save_post('aaaaaaaa-0000-4000-8000-000000000001', null, 'fundraising', 'X', null, 'Give', null, null, null, null) $$,
  '23514', null, 'a fundraising post needs a link'
);
select throws_ok(
  $$ select public.save_post('aaaaaaaa-0000-4000-8000-000000000001', null, 'fundraising', 'X', null, 'Give', 'http://give.test/x', null, null, null) $$,
  '23514', null, 'an http link is refused'
);
select throws_ok(
  $$ select public.save_post('aaaaaaaa-0000-4000-8000-000000000001', null, 'fundraising', 'X', null, 'Give', 'javascript:alert(1)', null, null, null) $$,
  '23514', null, 'a javascript: link is refused'
);
select throws_ok(
  $$ select public.save_post('aaaaaaaa-0000-4000-8000-000000000001', null, 'fundraising', 'X', null, 'Give', 'https://user:pass@give.test/x', null, null, null) $$,
  '23514', null, 'credentials in the link are refused'
);
select throws_ok(
  $$ select public.save_post('aaaaaaaa-0000-4000-8000-000000000001', null, 'fundraising', 'X', null, null, 'https://give.test/x', null, null, null) $$,
  '23514', null, 'a fundraising post needs a description'
);
select throws_ok(
  $$ select public.save_post('aaaaaaaa-0000-4000-8000-000000000001', null, 'news', 'X', null, null, null, null, null,
       'aaaaaaaa-0000-4000-8000-000000000002/0b1c2d3e-0000-4000-8000-000000000002.jpg') $$,
  '22023', null, 'a cover from another school''s folder is refused'
);
select throws_ok(
  $$ select public.save_post('aaaaaaaa-0000-4000-8000-000000000001', null, 'news', 'X', null, null, null, null, null,
       'aaaaaaaa-0000-4000-8000-000000000001/0b1c2d3e-0000-4000-8000-00000000ffff.jpg') $$,
  '22023', null, 'a cover that was never uploaded is refused'
);
select is(
  (select kind::text from public.school_posts where id = (select id from ids where name = 'news')),
  'news', 'the kind is kept'
);
select lives_ok(
  $$ select public.save_post('aaaaaaaa-0000-4000-8000-000000000001', (select id from ids where name = 'news'),
       'fundraising', 'Robotics lab opens', '{"type": "doc", "content": []}', 'A new lab', null, null, null,
       'aaaaaaaa-0000-4000-8000-000000000001/0b1c2d3e-0000-4000-8000-000000000001.jpg') $$,
  'editing a post works'
);
select is(
  (select kind::text || ':' || title from public.school_posts where id = (select id from ids where name = 'news')),
  'news:Robotics lab opens', 'editing never changes the kind'
);

-- Publish the news post and the fundraising post now; the draft stays a draft.
select is(public.publish_post((select id from ids where name = 'news')), 0, 'publishing without notifying queues no email');
select lives_ok($$ select public.publish_post((select id from ids where name = 'fund')) $$, 'the fundraising post is published');
insert into ids values ('later', public.save_post('aaaaaaaa-0000-4000-8000-000000000001', null, 'news', 'Next week',
  null, null, null, null, null, null));
select lives_ok(
  $$ select public.publish_post((select id from ids where name = 'later'), now() + interval '7 days') $$,
  'a post is scheduled'
);
select throws_ok(
  $$ select public.publish_post((select id from ids where name = 'later'), now() + interval '2 years') $$,
  '22023', null, 'a post cannot be scheduled more than a year ahead'
);
select is((select count(*)::int from public.school_posts where institution_id = 'aaaaaaaa-0000-4000-8000-000000000001'),
  4, 'the school admin sees every post of the school, drafts included');
reset role;

select is(
  (select array_agg(action order by action) from public.audit_log
   where target_type = 'school_post' and target_id in (select id::text from ids)),
  array['post.created', 'post.created', 'post.created', 'post.created', 'post.published', 'post.published',
        'post.published', 'post.updated'],
  'every change is audited'
);

-- Reading ---------------------------------------------------------------------------------------------------------
select pg_temp.login('11111111-1111-4111-8111-000000000002'); -- alumnus H
select results_eq(
  $$ select title from public.school_posts order by title $$,
  $$ values ('Library campaign'), ('Robotics lab opens') $$,
  'an alumnus sees only published, live posts: no draft, no scheduled post'
);
select throws_ok(
  $$ update public.school_posts set title = 'hacked' $$, '42501', null, 'an alumnus cannot write to the table'
);
reset role;

select pg_temp.login('11111111-1111-4111-8111-000000000004'); -- reviewer H
select is((select count(*)::int from public.school_posts), 2, 'a reviewer reads published posts like an alumnus');
reset role;

select pg_temp.login('11111111-1111-4111-8111-000000000005'); -- alumnus T
select is((select count(*)::int from public.school_posts), 0, 'another school''s alumnus sees none of them');
select throws_ok(
  $$ select public.record_post_click((select id from ids where name = 'fund')) $$,
  '42501', null, 'nor can they record a click on them'
);
reset role;

select pg_temp.login('11111111-1111-4111-8111-000000000010'); -- suspended alumnus H
select is((select count(*)::int from public.school_posts), 0, 'a suspended alumnus sees no post');
reset role;

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select throws_ok($$ select id from public.school_posts $$, '42501', null, 'anon cannot read posts');
reset role;

-- An expired fundraising post drops off for readers but stays in the admin list.
update public.school_posts set ends_on = public.school_today() - 1 where id = (select id from ids where name = 'fund');
select pg_temp.login('11111111-1111-4111-8111-000000000002');
select is((select count(*)::int from public.school_posts where kind = 'fundraising'), 0, 'an ended campaign is hidden from alumni');
reset role;
select pg_temp.login('11111111-1111-4111-8111-000000000001');
select is((select count(*)::int from public.school_posts where kind = 'fundraising'), 1, 'the school admin still sees it');
reset role;
update public.school_posts set ends_on = null where id = (select id from ids where name = 'fund');

-- Covers: readers fetch a cover only through a post they may read.
select pg_temp.login('11111111-1111-4111-8111-000000000002');
select is(
  (select count(*)::int from storage.objects where bucket_id = 'post-covers'), 1,
  'an alumnus can read the cover of a published post of their school only'
);
reset role;

-- Clicks ------------------------------------------------------------------------------------------------------------
select pg_temp.login('11111111-1111-4111-8111-000000000002');
select is(public.record_post_click((select id from ids where name = 'fund')), 'https://give.herzliah.test/library',
  'the outbound button gets the campaign address');
select lives_ok($$ select public.record_post_click((select id from ids where name = 'fund')) $$, 'a second click the same day');
select throws_ok(
  $$ select public.record_post_click((select id from ids where name = 'news')) $$,
  '42501', null, 'a news post has no outbound click'
);
select throws_ok(
  $$ select public.record_post_click((select id from ids where name = 'later')) $$,
  '42501', null, 'nor does a post that is not live yet'
);
select is((select count(*)::int from public.post_link_clicks), 0, 'an alumnus cannot read the clicks');
reset role;
select is(
  (select count(*)::int from public.post_link_clicks where post_id = (select id from ids where name = 'fund')),
  1, 'clicks are recorded once per alumnus, post and day'
);
select pg_temp.login('11111111-1111-4111-8111-000000000001');
select is((select count(*)::int from public.post_link_clicks), 0, 'a school admin cannot read the clicks either (POST-07)');
reset role;
select pg_temp.login('11111111-1111-4111-8111-000000000006');
select is((select count(*)::int from public.post_link_clicks), 1, 'a platform admin can');
reset role;

-- Notify (POST-04) --------------------------------------------------------------------------------------------------
-- The school's own template must be approved for an email to be queued rather than skipped (DEC-06).
update public.email_templates set status = 'approved'
where institution_id = 'aaaaaaaa-0000-4000-8000-000000000001' and key = 'post_published';
select pg_temp.login('11111111-1111-4111-8111-000000000001');
select cmp_ok(
  public.publish_post((select id from ids where name = 'later'), now() + interval '7 days', true), '>', 0,
  'notifying queues one email per active, onboarded alumnus'
);
reset role;
select is(
  (select count(*)::int from public.email_outbox o
   join public.alumni_profiles p on p.user_id = o.to_user_id and p.institution_id = o.institution_id
   where o.subject_id = (select id from ids where name = 'later')
     and (p.status <> 'active' or p.onboarding_completed_at is null)),
  0, 'no email for a suspended or not yet onboarded alumnus'
);
select is(
  (select count(*)::int from public.email_outbox where subject_id = (select id from ids where name = 'later')
     and to_user_id in ('11111111-1111-4111-8111-000000000005', '11111111-1111-4111-8111-000000000001')),
  0, 'no email to another school''s alumni or to staff'
);
select is(
  (select bool_and(next_attempt_at > now() + interval '6 days') from public.email_outbox
   where subject_id = (select id from ids where name = 'later') and status = 'queued'),
  true, 'the emails wait until the post goes live'
);
select pg_temp.login('11111111-1111-4111-8111-000000000001');
select is(public.publish_post((select id from ids where name = 'later'), null, true), 0, 'a post notifies at most once');
reset role;
select is(
  (select bool_and(next_attempt_at <= now()) from public.email_outbox
   where subject_id = (select id from ids where name = 'later') and status = 'queued'),
  true, 'publishing now moves the waiting emails to now'
);
select pg_temp.login('11111111-1111-4111-8111-000000000001');
select lives_ok($$ select public.unpublish_post((select id from ids where name = 'later')) $$, 'unpublishing');
reset role;
select is(
  (select count(*)::int from public.email_outbox where subject_id = (select id from ids where name = 'later') and status = 'queued'),
  0, 'unpublishing drops the emails that were still waiting'
);

-- Archive and delete --------------------------------------------------------------------------------------------------
select pg_temp.login('11111111-1111-4111-8111-000000000001');
select throws_ok(
  $$ select public.delete_post((select id from ids where name = 'fund')) $$,
  '22023', null, 'a published post is archived, not deleted'
);
select lives_ok($$ select public.archive_post((select id from ids where name = 'fund')) $$, 'archiving');
select throws_ok(
  $$ select public.publish_post((select id from ids where name = 'fund')) $$,
  '22023', null, 'an archived post cannot be published'
);
select lives_ok($$ select public.delete_post((select id from ids where name = 'draft')) $$, 'a draft is deleted');
reset role;
select pg_temp.login('11111111-1111-4111-8111-000000000002');
select results_eq(
  $$ select title from public.school_posts $$, $$ values ('Robotics lab opens') $$,
  'archived posts disappear for alumni'
);
reset role;

-- Email template --------------------------------------------------------------------------------------------------------
select lives_ok(
  $$ select public.validate_template_text('{post_title}', 'Read {post_excerpt} at {post_link}') $$,
  'the post placeholders are allowed in templates'
);

select * from finish();
rollback;
