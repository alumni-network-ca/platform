-- School posts (EPIC-POSTS, POST-01..POST-04; design docs/design/school-posts.md): news and fundraising posts a
-- school publishes for its alumni.
-- 1. school_posts: one table, a kind (news | fundraising), scoped to the school. A fundraising post must carry an
--    https link; a check constraint refuses anything else (no http, javascript: or credentials in the address).
--    The platform never handles payments: a fundraising post only points at the school's own campaign page.
-- 2. Read: holders of posts.manage (school admins) see every post of their school; holders of posts.read (alumni,
--    reviewers, school admins, and platform admins with a support grant) see published, live, unexpired posts only.
--    "Scheduled" is a published post whose publish_at is in the future: it stays invisible until then, with no job.
-- 3. Write: only through the RPCs below, which check posts.manage and write the audit log. News bodies are a
--    rich-text document (JSON) that the app renders through an allow-list (lib/posts/richtext.ts).
-- 4. post_link_clicks: one row per alumnus, post and day when someone presses a fundraising post's outbound
--    button (decided 2026-11-24). Only platform admins may read it; showing counts to schools is POST-07.
-- 5. Covers: a private storage bucket, one folder per school. Staff with posts.manage upload; readers can fetch
--    the cover of a post they may read.
-- 6. POST-04: publish_post can queue one "post_published" email per active alumnus, once per post, timed for the
--    moment the post goes live. Unpublishing or archiving before then drops the queued emails.

create type public.post_kind as enum ('news', 'fundraising');
create type public.post_status as enum ('draft', 'published', 'archived');

-- An https address with a host name: no credentials, no other scheme, no spaces or angle brackets.
-- Kept inline (a check constraint can't call a security definer helper cheaply, and every public function must be one).
create table public.school_posts (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  kind public.post_kind not null,
  title text not null check (length(trim(title)) between 1 and 160),
  -- News: the rich-text document. Fundraising posts have none.
  body jsonb check (body is null or (jsonb_typeof(body) = 'object' and octet_length(body::text) <= 200000)),
  -- Fundraising: the description. News: a plain-text excerpt the app derives from the body, for cards and email.
  summary text check (summary is null or length(summary) <= 500),
  external_url text check (
    external_url is null or (
      length(external_url) <= 2000
      and external_url ~ '^https://[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)+(:[0-9]{1,5})?([/?#][^[:space:]<>"]*)?$'
    )
  ),
  goal_note text check (goal_note is null or length(goal_note) <= 120),
  ends_on date,
  cover_path text check (
    cover_path is null or cover_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
  ),
  status public.post_status not null default 'draft',
  publish_at timestamptz,
  -- Set once the notification emails are queued: a post notifies at most once.
  notified_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (kind <> 'fundraising' or external_url is not null),
  check (kind <> 'fundraising' or length(trim(coalesce(summary, ''))) > 0),
  check (kind <> 'fundraising' or body is null),
  check (status <> 'published' or publish_at is not null)
);
create index school_posts_feed_idx on public.school_posts (institution_id, status, publish_at desc);
create trigger touch_school_posts before update on public.school_posts
  for each row execute function public.touch_updated_at();

-- Posts end at the end of their last day, in the schools' time zone (every school is in Quebec or Ontario today).
create function public.school_today() returns date
language sql stable security definer set search_path = '' as $$
  select (now() at time zone 'America/Toronto')::date;
$$;

alter table public.school_posts enable row level security;
create policy school_posts_read on public.school_posts for select to authenticated
  using (
    institution_id in (select public.permitted_institutions('posts.manage'))
    or (
      status = 'published' and publish_at <= now()
      and (ends_on is null or ends_on >= (select public.school_today()))
      and institution_id in (select public.permitted_institutions('posts.read'))
    )
  );
grant select on public.school_posts to authenticated;

create table public.post_link_clicks (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.school_posts (id) on delete cascade,
  institution_id uuid not null references public.institutions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  clicked_on date not null,
  created_at timestamptz not null default now(),
  unique (post_id, user_id, clicked_on)
);
create index post_link_clicks_school_idx on public.post_link_clicks (institution_id, post_id);
alter table public.post_link_clicks enable row level security;
-- Platform admins only. School staff get no read until POST-07 (aggregate counts, never who clicked).
create policy post_link_clicks_read on public.post_link_clicks for select to authenticated
  using ((select public.is_system_admin()));
grant select on public.post_link_clicks to authenticated;

insert into public.role_permissions (role, permission) values
  ('school_admin', 'posts.manage'), ('school_admin', 'posts.read'),
  ('reviewer', 'posts.read'),
  ('alumni', 'posts.read');

-- Covers -------------------------------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-covers', 'post-covers', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Paths are <school id>/<random id>.<ext>. Staff who manage posts upload and remove their school's covers.
create policy post_covers_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'post-covers'
    and (storage.foldername(name))[1] in (select x::text from public.permitted_institutions('posts.manage') x)
  );
create policy post_covers_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'post-covers'
    and (storage.foldername(name))[1] in (select x::text from public.permitted_institutions('posts.manage') x)
  );
-- Readers fetch a cover only through a post they may read (school_posts' own policy applies here).
create policy post_covers_read on storage.objects for select to authenticated
  using (
    bucket_id = 'post-covers'
    and (
      (storage.foldername(name))[1] in (select x::text from public.permitted_institutions('posts.manage') x)
      or name in (select p.cover_path from public.school_posts p where p.cover_path is not null)
    )
  );

-- Write paths ----------------------------------------------------------------------------------------------------

-- Creates (p_post null) or edits a post. The kind is fixed at creation. The status is changed by publish_post,
-- unpublish_post and archive_post only.
-- Every argument but the school may be left out (null): a new post has no id, a news post no link, and so on.
create function public.save_post(
  p_inst uuid, p_post uuid default null, p_kind public.post_kind default null, p_title text default null,
  p_body jsonb default null, p_summary text default null, p_external_url text default null,
  p_goal_note text default null, p_ends_on date default null, p_cover_path text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_kind public.post_kind := p_kind;
  v_id uuid;
  v_cover text := nullif(trim(p_cover_path), '');
begin
  perform public.assert_permission(p_inst, 'posts.manage');
  if p_post is not null then
    select kind into v_kind from public.school_posts where id = p_post and institution_id = p_inst for update;
    if not found then
      raise exception 'not allowed' using errcode = '42501';
    end if;
  end if;
  if v_kind is null then
    raise exception 'a kind is required' using errcode = '22023';
  end if;
  if v_cover is not null and (
    split_part(v_cover, '/', 1) <> p_inst::text
    or not exists (select 1 from storage.objects where bucket_id = 'post-covers' and name = v_cover)
  ) then
    raise exception 'unknown cover image' using errcode = '22023';
  end if;
  if p_post is null and p_ends_on is not null and p_ends_on < public.school_today() then
    raise exception 'the end date has passed' using errcode = '22023';
  end if;

  if p_post is null then
    insert into public.school_posts (institution_id, kind, title, body, summary, external_url, goal_note, ends_on,
      cover_path, created_by, updated_by)
    values (p_inst, v_kind, trim(p_title),
      case when v_kind = 'news' then p_body end,
      nullif(trim(p_summary), ''), nullif(trim(p_external_url), ''),
      case when v_kind = 'fundraising' then nullif(trim(p_goal_note), '') end,
      case when v_kind = 'fundraising' then p_ends_on end,
      v_cover, auth.uid(), auth.uid())
    returning id into v_id;
    perform public.log_audit(p_inst, 'post.created', 'school_post', v_id::text, jsonb_build_object('kind', v_kind));
  else
    update public.school_posts set
      title = trim(p_title),
      body = case when v_kind = 'news' then p_body end,
      summary = nullif(trim(p_summary), ''),
      external_url = nullif(trim(p_external_url), ''),
      goal_note = case when v_kind = 'fundraising' then nullif(trim(p_goal_note), '') end,
      ends_on = case when v_kind = 'fundraising' then p_ends_on end,
      cover_path = v_cover,
      updated_by = auth.uid()
    where id = p_post
    returning id into v_id;
    perform public.log_audit(p_inst, 'post.updated', 'school_post', v_id::text, jsonb_build_object('kind', v_kind));
  end if;
  return v_id;
end $$;

-- Drops the notification emails of a post that are still waiting to go out. Once none was ever sent, the post may
-- notify again when it is published again.
create function public.cancel_post_emails(p_post uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.email_outbox
  where subject_id = p_post and template_key = 'post_published' and status = 'queued';
  if not exists (select 1 from public.email_outbox where subject_id = p_post and template_key = 'post_published') then
    update public.school_posts set notified_at = null where id = p_post;
  end if;
end $$;

-- Publishes now, or at p_publish_at (a scheduled post). Republishing a live post without a time keeps its date.
-- p_notify queues one email per active, onboarded alumnus, at most once per post; the emails wait for publish_at.
-- Returns the number of emails queued by this call.
create function public.publish_post(p_post uuid, p_publish_at timestamptz default null, p_notify boolean default false)
returns int
language plpgsql security definer set search_path = '' as $$
declare
  v public.school_posts;
  v_at timestamptz;
  v_queued int := 0;
begin
  select * into v from public.school_posts where id = p_post for update;
  if not found then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  perform public.assert_permission(v.institution_id, 'posts.manage');
  if v.status = 'archived' then
    raise exception 'an archived post cannot be published' using errcode = '22023';
  end if;
  if p_publish_at is not null and p_publish_at > now() + interval '1 year' then
    raise exception 'a post can be scheduled at most a year ahead' using errcode = '22023';
  end if;
  if v.ends_on is not null and v.ends_on < public.school_today() then
    raise exception 'the end date has passed' using errcode = '22023';
  end if;

  v_at := case
    when p_publish_at is null and v.status = 'published' and v.publish_at <= now() then v.publish_at
    else greatest(coalesce(p_publish_at, now()), now())
  end;
  update public.school_posts set status = 'published', publish_at = v_at, updated_by = auth.uid() where id = p_post;

  if p_notify and v.notified_at is null then
    perform public.enqueue_email(v.institution_id, 'post_published', m.user_id, u.email, v.id)
    from public.institution_memberships m
    join public.alumni_profiles p
      on p.institution_id = m.institution_id and p.user_id = m.user_id
     and p.status = 'active' and p.onboarding_completed_at is not null
    join auth.users u on u.id = m.user_id
    where m.institution_id = v.institution_id and m.role = 'alumni' and m.status = 'active' and u.email is not null;
    get diagnostics v_queued = row_count;
    update public.school_posts set notified_at = now() where id = p_post;
  end if;
  -- New or already queued emails go out when the post does.
  update public.email_outbox set next_attempt_at = v_at
  where subject_id = p_post and template_key = 'post_published' and status = 'queued';

  perform public.log_audit(v.institution_id, 'post.published', 'school_post', p_post::text,
    jsonb_build_object('publish_at', v_at, 'notified', v_queued));
  return v_queued;
end $$;

create function public.unpublish_post(p_post uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v public.school_posts;
begin
  select * into v from public.school_posts where id = p_post for update;
  if not found then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  perform public.assert_permission(v.institution_id, 'posts.manage');
  update public.school_posts set status = 'draft', publish_at = null, updated_by = auth.uid() where id = p_post;
  perform public.cancel_post_emails(p_post);
  perform public.log_audit(v.institution_id, 'post.unpublished', 'school_post', p_post::text);
end $$;

create function public.archive_post(p_post uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v public.school_posts;
begin
  select * into v from public.school_posts where id = p_post for update;
  if not found then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  perform public.assert_permission(v.institution_id, 'posts.manage');
  update public.school_posts set status = 'archived', updated_by = auth.uid() where id = p_post;
  perform public.cancel_post_emails(p_post);
  perform public.log_audit(v.institution_id, 'post.archived', 'school_post', p_post::text);
end $$;

-- Only drafts are deleted; a post alumni may have seen is archived instead, so its history stays.
create function public.delete_post(p_post uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v public.school_posts;
begin
  select * into v from public.school_posts where id = p_post for update;
  if not found then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  perform public.assert_permission(v.institution_id, 'posts.manage');
  if v.status <> 'draft' then
    raise exception 'only a draft can be deleted' using errcode = '22023';
  end if;
  perform public.cancel_post_emails(p_post);
  delete from public.school_posts where id = p_post;
  perform public.log_audit(v.institution_id, 'post.deleted', 'school_post', p_post::text,
    jsonb_build_object('kind', v.kind, 'title', v.title));
end $$;

-- The outbound button of a fundraising post: records the click (once per person, post and day) and returns the
-- address to open. Only a post the caller may read; a support visit by a platform admin is not recorded.
create function public.record_post_click(p_post uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v public.school_posts;
begin
  select * into v from public.school_posts
  where id = p_post and kind = 'fundraising' and status = 'published' and publish_at <= now()
    and (ends_on is null or ends_on >= public.school_today());
  if not found or auth.uid() is null or not public.has_permission(v.institution_id, 'posts.read') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if public.is_member(v.institution_id) then
    insert into public.post_link_clicks (post_id, institution_id, user_id, clicked_on)
    values (v.id, v.institution_id, auth.uid(), public.school_today())
    on conflict do nothing;
  end if;
  return v.external_url;
end $$;

-- Email (POST-04) ------------------------------------------------------------------------------------------------

-- As 20261029000100 left it, plus the three post placeholders.
create or replace function public.validate_template_text(p_subject text, p_body text) returns void
language plpgsql immutable set search_path = '' as $$
declare
  v_name text;
begin
  if position('<' in p_subject) > 0 or position('<' in p_body) > 0 then
    raise exception 'templates are plain text: HTML is not allowed' using errcode = '22023';
  end if;
  for v_name in select (regexp_matches(p_subject || ' ' || p_body, '\{([^}]*)\}', 'g'))[1] loop
    if v_name not in ('first_name', 'school_name', 'sign_in_link', 'action_link', 'confirm_link', 'reason', 'message',
                      'graduation_year', 'onboarding_link', 'post_title', 'post_excerpt', 'post_link') then
      raise exception 'unknown placeholder {%}', v_name using errcode = '22023';
    end if;
  end loop;
end $$;

insert into public.email_templates (institution_id, key, locale, status, subject, body) values
  (null, 'post_published', 'en', 'approved', 'New from {school_name}: {post_title}',
   E'Hi {first_name},\n\n{school_name} posted something new on the Alumni Network:\n\n{post_title}\n{post_excerpt}\n\nRead it here:\n{post_link}'),
  (null, 'post_published', 'fr', 'approved', 'Nouveau de {school_name} : {post_title}',
   E'Bonjour {first_name},\n\n{school_name} a publié du nouveau sur le Réseau des anciens :\n\n{post_title}\n{post_excerpt}\n\nPour le lire :\n{post_link}');

-- Schools that already exist get the new texts as drafts: an admin approves them in /admin/templates before any
-- post email is sent (DEC-06); until then the emails are recorded as skipped_no_template.
insert into public.email_templates (institution_id, key, locale, status, subject, body)
select i.id, t.key, t.locale, 'draft', t.subject, t.body
from public.institutions i
cross join public.email_templates t
where t.institution_id is null and t.key = 'post_published'
on conflict do nothing;

-- Privileges ------------------------------------------------------------------------------------------------------
revoke execute on function public.school_today(), public.cancel_post_emails(uuid),
  public.save_post(uuid, uuid, public.post_kind, text, jsonb, text, text, text, date, text),
  public.publish_post(uuid, timestamptz, boolean), public.unpublish_post(uuid), public.archive_post(uuid),
  public.delete_post(uuid), public.record_post_click(uuid)
  from public, anon;
revoke execute on function public.cancel_post_emails(uuid) from authenticated;
grant execute on function public.school_today(),
  public.save_post(uuid, uuid, public.post_kind, text, jsonb, text, text, text, date, text),
  public.publish_post(uuid, timestamptz, boolean), public.unpublish_post(uuid), public.archive_post(uuid),
  public.delete_post(uuid), public.record_post_click(uuid)
  to authenticated;
