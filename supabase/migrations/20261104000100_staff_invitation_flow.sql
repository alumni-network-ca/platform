-- Staff invitation flow (docs/design/staff-invite.md §6): what an invitation link shows before sign-in, Resend
-- restarting the 7 days, the nav bar's invitee state, and the name a new staff member gives at sign-up.

-- The name a school shows for a person: their profile there, else their latest request there, else the name they
-- gave when creating a staff account (auth metadata, A6.2). All three are self-entered. Internal helper.
create function public.person_name(p_inst uuid, p_user uuid) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select nullif(concat_ws(' ', coalesce(p.preferred_name, p.first_name), p.last_name), '')
     from public.alumni_profiles p where p.institution_id = p_inst and p.user_id = p_user and p.status <> 'deleted'),
    (select nullif(concat_ws(' ', r.first_name, r.last_name), '') from public.access_requests r
     where r.institution_id = p_inst and r.user_id = p_user order by r.created_at desc, r.id limit 1),
    (select nullif(concat_ws(' ', nullif(trim(u.raw_user_meta_data->>'first_name'), ''),
                                  nullif(trim(u.raw_user_meta_data->>'last_name'), '')), '')
     from auth.users u where u.id = p_user));
$$;

create or replace function public.school_staff(p_inst uuid)
returns table(user_id uuid, role public.member_role, status public.member_status, joined_at timestamptz, email text, name text)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.assert_permission(p_inst, 'staff.manage');
  return query
  select m.user_id, m.role, m.status, m.created_at, u.email::text, public.person_name(p_inst, m.user_id)
  from public.institution_memberships m join auth.users u on u.id = m.user_id
  where m.institution_id = p_inst and m.status = 'active' and m.role in ('school_admin', 'reviewer')
  order by m.created_at, m.user_id;
end $$;

create or replace function public.audit_people(p_inst uuid)
returns table(user_id uuid, label text, kind text)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.assert_permission(p_inst, 'audit.read');
  return query
  with actors as (
    select a.actor_user_id as uid from public.audit_log a where a.institution_id = p_inst and a.actor_user_id is not null
    union
    select m.user_id from public.institution_memberships m
    where m.institution_id = p_inst and m.status = 'active' and m.role in ('school_admin', 'reviewer')
  ), people as (
    select a.uid, exists(select 1 from public.platform_admins pa where pa.user_id = a.uid)
      or exists(select 1 from public.audit_log l where l.institution_id = p_inst and l.actor_user_id = a.uid and l.actor_kind = 'system_admin') as support,
      exists(select 1 from public.institution_memberships m where m.institution_id = p_inst and m.user_id = a.uid
        and m.status = 'active' and m.role in ('school_admin', 'reviewer')) as staff
    from actors a
  )
  select a.uid, case when a.support then 'Platform support' else
    coalesce(public.person_name(p_inst, a.uid), u.email::text, 'Former user') end,
    case when a.support then 'support' when a.staff then 'staff' else 'former' end
  from people a left join auth.users u on u.id = a.uid order by a.uid;
end $$;

-- What an invitation link shows before anyone signs in (A6.1, A6.4, A6.7). The token is the credential: 32 random
-- bytes sent only to the invited address, so whoever holds it may see what that email says. An unknown token
-- returns 'invalid' and nothing else. Reads only; accept_staff_invitation still checks the signed-in email.
create function public.staff_invitation_preview(p_token text)
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
    v_inv.institution_id, v_inv.role, v_inv.email,
    -- A platform admin appointing a school's first admin is shown as the platform, not by name. Staff without a
    -- name are shown by the address their invitation email replies to.
    case when exists(select 1 from public.platform_admins pa where pa.user_id = v_inv.invited_by) then null
         else coalesce(public.person_name(v_inv.institution_id, v_inv.invited_by),
                       (select u.email::text from auth.users u where u.id = v_inv.invited_by)) end,
    v_inv.created_at, v_inv.expires_at, coalesce(v_inv.accepted_at, v_inv.revoked_at);
end $$;

-- The open staff invitation for the signed-in person's email at a school, if any: the nav bar's invitee state.
create function public.my_staff_invitation(p_inst uuid) returns public.member_role
language sql stable security definer set search_path = '' as $$
  select i.role from public.staff_invitations i
  where i.institution_id = p_inst and i.accepted_at is null and i.revoked_at is null and i.expires_at > now()
    and lower(i.email) = (select lower(u.email) from auth.users u where u.id = auth.uid())
  order by i.created_at desc limit 1;
$$;

-- A new link also restarts the 7 days (Resend, A5.2). Only the newest link works.
create or replace function public.issue_staff_invitation_link(p_invitation uuid) returns text
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
  update public.staff_invitations
  set token_hash = public.hash_token(v_token), expires_at = now() + interval '7 days'
  where id = p_invitation;
  perform public.log_audit(v_inv.institution_id, 'staff.invitation_link_issued', 'staff_invitation', p_invitation::text);
  return v_token;
end $$;

revoke execute on function public.person_name(uuid, uuid), public.staff_invitation_preview(text),
  public.my_staff_invitation(uuid) from public, anon, authenticated;
grant execute on function public.staff_invitation_preview(text) to anon, authenticated;
grant execute on function public.my_staff_invitation(uuid) to authenticated;
