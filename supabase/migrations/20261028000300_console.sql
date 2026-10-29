-- Platform console (SA-01, SA-02; design S1–S2 in docs/design/alumni-full-flow): what the console needs beyond
-- the v2 RPCs. The console shows counts per school, never alumni personal data (ADR 0005).

-- Branding keys a school may set, checked once here. Unknown keys are dropped.
create function public.clean_branding(p_branding jsonb) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare
  v_out jsonb := '{}'::jsonb;
  v_short text := nullif(trim(p_branding ->> 'short_name'), '');
  v_logo text := nullif(trim(p_branding ->> 'logo'), '');
  v_key text;
begin
  if p_branding is null or jsonb_typeof(p_branding) <> 'object' then
    return v_out;
  end if;
  if v_short is not null then
    if length(v_short) > 40 then
      raise exception 'the short name is 40 characters at most' using errcode = '22023';
    end if;
    v_out := v_out || jsonb_build_object('short_name', v_short);
  end if;
  if v_logo is not null then
    if length(v_logo) > 300 or not (v_logo like '/%' or v_logo like 'https://%') then
      raise exception 'the logo must be a site path or an https address' using errcode = '22023';
    end if;
    v_out := v_out || jsonb_build_object('logo', v_logo);
  end if;
  foreach v_key in array array['primary_color', 'accent_color'] loop
    if nullif(trim(p_branding ->> v_key), '') is not null then
      if trim(p_branding ->> v_key) !~ '^#[0-9A-Fa-f]{6}$' then
        raise exception '% must be a colour such as #0B2159', v_key using errcode = '22023';
      end if;
      v_out := v_out || jsonb_build_object(v_key, upper(trim(p_branding ->> v_key)));
    end if;
  end loop;
  return v_out;
end $$;

-- Creating a school now also takes its short name, colours and email sender name (design S1.2). Addresses
-- the platform uses for itself are reserved.
drop function public.platform_create_school(text, text, public.locale, text);
create function public.platform_create_school(
  p_name text, p_slug text, p_default_locale public.locale default 'en', p_reply_to text default null,
  p_branding jsonb default '{}'::jsonb, p_email_display_name text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_slug text := lower(trim(p_slug));
begin
  if not public.is_system_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_slug in ('www', 'api', 'app', 'admin', 'console', 'staging', 'mail', 'status', 'support', 'help', 'root') then
    raise exception 'that address is reserved' using errcode = '22023';
  end if;
  insert into public.institutions (name, slug, default_locale, reply_to_email, branding, email_display_name)
  values (trim(p_name), v_slug, p_default_locale, nullif(lower(trim(p_reply_to)), ''),
          public.clean_branding(p_branding), nullif(trim(p_email_display_name), ''))
  returning id into v_id;
  perform public.log_audit(v_id, 'school.created', 'institution', v_id::text, jsonb_build_object('slug', v_slug));
  return v_id;
end $$;

-- One row per school, counts only (design S1.1).
create function public.platform_school_summaries()
returns table (
  id uuid, name text, slug text, status text, created_at timestamptz,
  members bigint, pending_requests bigint, staff bigint, open_invitations bigint, active_grants bigint
)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if not public.is_system_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
  select i.id, i.name, i.slug, i.status, i.created_at,
    (select count(*) from public.institution_memberships m
     where m.institution_id = i.id and m.status = 'active' and m.role = 'alumni'),
    (select count(*) from public.access_requests r where r.institution_id = i.id and r.status = 'pending'),
    (select count(*) from public.institution_memberships m
     where m.institution_id = i.id and m.status = 'active' and m.role in ('school_admin', 'reviewer')),
    (select count(*) from public.staff_invitations s
     where s.institution_id = i.id and s.accepted_at is null and s.revoked_at is null and s.expires_at > now()),
    (select count(*) from public.platform_access_grants g
     where g.institution_id = i.id and g.revoked_at is null and g.expires_at > now())
  from public.institutions i
  order by i.name;
end $$;

-- Platform admins' sign-in emails, so the console can say who opened a grant (design S2.1).
create function public.platform_admin_emails() returns table (user_id uuid, email text)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if not public.is_system_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
  select a.user_id, u.email::text from public.platform_admins a join auth.users u on u.id = a.user_id order by u.email;
end $$;

-- Suspend or reactivate a school (design S2.2). A suspended school's address answers 404, its staff lose every
-- permission (has_permission checks the status) and its data is kept. Offboarding waits for DEC-08's job.
create function public.platform_set_school_status(p_inst uuid, p_status text, p_reason text default null)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_system_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_status not in ('active', 'suspended') then
    raise exception 'unknown school status %', p_status using errcode = '22023';
  end if;
  if p_status = 'suspended' and coalesce(trim(p_reason), '') = '' then
    raise exception 'a reason is required' using errcode = '22023';
  end if;
  update public.institutions set status = p_status where id = p_inst and status <> p_status;
  if not found then
    raise exception 'the school is already % or does not exist', p_status using errcode = '22023';
  end if;
  perform public.log_audit(p_inst, case p_status when 'suspended' then 'school.suspended' else 'school.reactivated' end,
    'institution', p_inst::text, jsonb_build_object('reason', nullif(trim(p_reason), '')));
end $$;

-- A link for an open staff invitation, for the person who sends it by hand while emails are not sent yet.
-- Each call replaces the token, so only the newest link works. The raw token is returned once and never logged.
create function public.issue_staff_invitation_link(p_invitation uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_inv public.staff_invitations;
  v_token text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  select * into v_inv from public.staff_invitations where id = p_invitation for update;
  if not found or not (public.is_system_admin() or public.has_permission(v_inv.institution_id, 'staff.manage')) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_inv.accepted_at is not null or v_inv.revoked_at is not null or v_inv.expires_at <= now() then
    raise exception 'this invitation is no longer open' using errcode = '22023';
  end if;
  update public.staff_invitations set token_hash = public.hash_token(v_token) where id = p_invitation;
  perform public.log_audit(v_inv.institution_id, 'staff.invitation_link_issued', 'staff_invitation', p_invitation::text);
  return v_token;
end $$;

create function public.revoke_staff_invitation(p_invitation uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_inv public.staff_invitations;
begin
  select * into v_inv from public.staff_invitations where id = p_invitation for update;
  if not found or not (public.is_system_admin() or public.has_permission(v_inv.institution_id, 'staff.manage')) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_inv.accepted_at is not null or v_inv.revoked_at is not null then
    raise exception 'this invitation is no longer open' using errcode = '22023';
  end if;
  update public.staff_invitations set revoked_at = now() where id = p_invitation;
  perform public.log_audit(v_inv.institution_id, 'staff.invitation_revoked', 'staff_invitation', p_invitation::text);
end $$;

revoke execute on function public.clean_branding(jsonb) from public, anon, authenticated;
revoke execute on function
  public.platform_create_school(text, text, public.locale, text, jsonb, text),
  public.platform_school_summaries(),
  public.platform_admin_emails(),
  public.platform_set_school_status(uuid, text, text),
  public.issue_staff_invitation_link(uuid),
  public.revoke_staff_invitation(uuid)
  from public, anon;
grant execute on function
  public.platform_create_school(text, text, public.locale, text, jsonb, text),
  public.platform_school_summaries(),
  public.platform_admin_emails(),
  public.platform_set_school_status(uuid, text, text),
  public.issue_staff_invitation_link(uuid),
  public.revoke_staff_invitation(uuid)
  to authenticated;
