-- A signed-in invitee can accept without the link (ADR 0016 amendment, docs/design/staff-invite.md §6). Signing
-- in at /login drops the invitation token, so the app routes an invitee to /staff/accept and accepts there by the
-- session's confirmed email: the same check accept_staff_invitation makes after the token.

-- Shared by both ways of accepting, so they can't drift: the membership, the invitation's end and the audit row.
-- Internal helper; the caller has locked the open invitation. It takes the id, not the row: a function of a table's
-- row type would show up as a computed column of that table in the API.
create function public.grant_staff_invitation(p_invitation uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  p_inv public.staff_invitations;
begin
  select * into p_inv from public.staff_invitations where id = p_invitation;
  insert into public.institution_memberships (institution_id, user_id, role)
  values (p_inv.institution_id, auth.uid(), p_inv.role)
  on conflict (institution_id, user_id) do update
    set role = case when public.institution_memberships.status = 'active' and public.institution_memberships.role = 'school_admin'
                    then public.institution_memberships.role else excluded.role end, status = 'active', status_reason = null, status_changed_at = now();
  update public.staff_invitations set accepted_by = auth.uid(), accepted_at = now() where id = p_inv.id;
  perform public.log_audit(p_inv.institution_id, 'staff.joined', 'staff_invitation', p_inv.id::text,
    jsonb_build_object('role', (select role from public.institution_memberships where institution_id = p_inv.institution_id and user_id = auth.uid())));
  return p_inv.institution_id;
end $$;

create or replace function public.accept_staff_invitation(p_token text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_inv public.staff_invitations;
begin
  select * into v_inv from public.staff_invitations
  where token_hash = public.hash_token(p_token) and accepted_at is null and revoked_at is null and expires_at > now()
    and lower(email) = (select lower(email) from auth.users where id = auth.uid())
  for update;
  if not found then
    raise exception 'this invitation is not valid for your account' using errcode = '42501';
  end if;
  return public.grant_staff_invitation(v_inv.id);
end $$;

-- Accepts the open invitation at a school for the signed-in person's confirmed email, without the link.
create function public.accept_my_staff_invitation(p_inst uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_inv public.staff_invitations;
begin
  select i.* into v_inv from public.staff_invitations i
  where i.institution_id = p_inst and i.accepted_at is null and i.revoked_at is null and i.expires_at > now()
    and lower(i.email) = (select lower(u.email) from auth.users u
                          where u.id = auth.uid() and u.email_confirmed_at is not null)
  order by i.created_at desc limit 1
  for update;
  if not found then
    raise exception 'no open staff invitation for your account here' using errcode = '42501';
  end if;
  return public.grant_staff_invitation(v_inv.id);
end $$;

-- Who a person sees as the sender: none for a platform admin appointing a school's first admin, else the inviter's
-- name, else their address. Internal helper, shared with staff_invitation_preview.
create function public.staff_inviter_name(p_inst uuid, p_invited_by uuid) returns text
language sql stable security definer set search_path = '' as $$
  select case when exists(select 1 from public.platform_admins pa where pa.user_id = p_invited_by) then null
              else coalesce(public.person_name(p_inst, p_invited_by),
                            (select u.email::text from auth.users u where u.id = p_invited_by)) end;
$$;

create or replace function public.staff_invitation_preview(p_token text)
returns table(status text, institution_id uuid, role public.member_role, email text, inviter_name text,
              invited_at timestamptz, expires_at timestamptz, ended_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_inv public.staff_invitations;
begin
  if p_token ~ '^[0-9a-f]{64}$' then
    select * into v_inv from public.staff_invitations i where i.token_hash = public.hash_token(p_token);
  end if;
  if v_inv.id is null then
    return query select 'invalid'::text, null::uuid, null::public.member_role, null::text, null::text,
      null::timestamptz, null::timestamptz, null::timestamptz;
    return;
  end if;
  return query select
    case when v_inv.accepted_at is not null then 'accepted'
         when v_inv.revoked_at is not null then 'revoked'
         when v_inv.expires_at <= now() then 'expired'
         else 'open' end,
    v_inv.institution_id, v_inv.role, v_inv.email, public.staff_inviter_name(v_inv.institution_id, v_inv.invited_by),
    v_inv.created_at, v_inv.expires_at, coalesce(v_inv.accepted_at, v_inv.revoked_at);
end $$;

-- What the accept page shows for the signed-in person's open invitation at a school (A6.4 without the link).
create function public.my_staff_invitation_preview(p_inst uuid)
returns table(role public.member_role, email text, inviter_name text, invited_at timestamptz, expires_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select i.role, i.email, public.staff_inviter_name(i.institution_id, i.invited_by), i.created_at, i.expires_at
  from public.staff_invitations i
  where i.institution_id = p_inst and i.accepted_at is null and i.revoked_at is null and i.expires_at > now()
    and lower(i.email) = (select lower(u.email) from auth.users u where u.id = auth.uid())
  order by i.created_at desc limit 1;
$$;

revoke execute on function public.grant_staff_invitation(uuid),
  public.staff_inviter_name(uuid, uuid), public.accept_my_staff_invitation(uuid),
  public.my_staff_invitation_preview(uuid) from public, anon, authenticated;
grant execute on function public.accept_my_staff_invitation(uuid), public.my_staff_invitation_preview(uuid)
  to authenticated;
