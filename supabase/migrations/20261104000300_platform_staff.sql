-- Platform admins invite school staff of either role and read a school's staff list (ADR 0005, amended 2026-11-04).
-- Staff only: never alumni or students. Changing a role or removing staff stays with the school's admins.

-- Internal: a school's active staff with email and display name. No permission check; callers check first.
create function public.list_school_staff(p_inst uuid)
returns table(user_id uuid, role public.member_role, status public.member_status, joined_at timestamptz, email text, name text)
language sql stable security definer set search_path = '' as $$
  select m.user_id, m.role, m.status, m.created_at, u.email::text, public.person_name(p_inst, m.user_id)
  from public.institution_memberships m join auth.users u on u.id = m.user_id
  where m.institution_id = p_inst and m.status = 'active' and m.role in ('school_admin', 'reviewer')
  order by m.created_at, m.user_id;
$$;
revoke all on function public.list_school_staff(uuid) from public, anon, authenticated;

create or replace function public.school_staff(p_inst uuid)
returns table(user_id uuid, role public.member_role, status public.member_status, joined_at timestamptz, email text, name text)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.assert_permission(p_inst, 'staff.manage');
  return query select * from public.list_school_staff(p_inst);
end $$;

create function public.platform_school_staff(p_inst uuid)
returns table(user_id uuid, role public.member_role, status public.member_status, joined_at timestamptz, email text, name text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_system_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query select * from public.list_school_staff(p_inst);
end $$;

-- create_staff_invitation refuses any role other than school_admin and reviewer (22023).
create function public.platform_invite_staff(p_inst uuid, p_email text, p_role public.member_role) returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_system_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return public.create_staff_invitation(p_inst, p_email, p_role);
end $$;

create or replace function public.platform_appoint_school_admin(p_inst uuid, p_email text) returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  return public.platform_invite_staff(p_inst, p_email, 'school_admin');
end $$;

revoke all on function public.platform_school_staff(uuid), public.platform_invite_staff(uuid, text, public.member_role)
  from public, anon;
grant execute on function public.platform_school_staff(uuid), public.platform_invite_staff(uuid, text, public.member_role)
  to authenticated;
