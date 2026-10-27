-- v2 baseline, part 2 of 3: permission helpers, row level security and grants.
-- Model: clients only ever SELECT (through the policies below); every write goes through a
-- security definer RPC in part 3. No table has an insert, update or delete policy.

-- Helpers ----------------------------------------------------------------------------------------------
-- All helpers are security definer so policies can call them without recursing through RLS.

create function public.is_system_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid());
$$;

create function public.has_active_grant(p_inst uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.platform_access_grants g
    join public.platform_admins a on a.user_id = g.user_id
    where g.user_id = auth.uid() and g.institution_id = p_inst
      and g.revoked_at is null and g.expires_at > now()
  );
$$;

create function public.is_member(p_inst uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.institution_memberships
    where institution_id = p_inst and user_id = auth.uid() and status = 'active'
  );
$$;

-- The single permission check used by policies and RPCs (ADR 0005).
-- directory.use also needs an active profile of the caller's own at that school.
-- System admins with an active grant get the *.read permissions only (read-only support access).
create function public.has_permission(p_inst uuid, p_perm text) returns boolean
language sql stable security definer set search_path = '' as $$
  select
    exists (
      select 1
      from public.institution_memberships m
      join public.role_permissions rp on rp.role = m.role
      join public.institutions i on i.id = m.institution_id and i.status = 'active'
      where m.institution_id = p_inst and m.user_id = auth.uid() and m.status = 'active'
        and rp.permission = p_perm
        and (p_perm <> 'directory.use' or exists (
          select 1 from public.alumni_profiles p
          where p.institution_id = p_inst and p.user_id = auth.uid() and p.status = 'active'))
    )
    or (p_perm like '%.read' and public.has_active_grant(p_inst));
$$;

create function public.assert_permission(p_inst uuid, p_perm text) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.has_permission(p_inst, p_perm) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
end $$;

create function public.owns_profile(p_profile uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.alumni_profiles where id = p_profile and user_id = auth.uid());
$$;

create function public.profile_is_visible(p_profile uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.alumni_profiles
    where id = p_profile and status = 'active' and visibility = 'members'
  );
$$;

-- RLS --------------------------------------------------------------------------------------------------

do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

create policy institutions_read on public.institutions for select to authenticated
  using (public.is_member(id) or public.has_active_grant(id) or public.is_system_admin());

create policy platform_admins_read on public.platform_admins for select to authenticated
  using (public.is_system_admin());

create policy platform_access_grants_read on public.platform_access_grants for select to authenticated
  using (public.is_system_admin() or public.has_permission(institution_id, 'audit.read'));

create policy memberships_read on public.institution_memberships for select to authenticated
  using (user_id = auth.uid() or public.has_permission(institution_id, 'records.read') or public.is_system_admin());

create policy role_permissions_read on public.role_permissions for select to authenticated using (true);

create policy staff_invitations_read on public.staff_invitations for select to authenticated
  using (public.has_permission(institution_id, 'staff.manage') or public.is_system_admin());

create policy user_preferences_read on public.user_preferences for select to authenticated
  using (user_id = auth.uid());

create policy career_fields_read on public.career_fields for select to authenticated
  using (institution_id is null or public.is_member(institution_id) or public.is_system_admin());

create policy offer_types_read on public.offer_types for select to authenticated
  using (institution_id is null or public.is_member(institution_id) or public.is_system_admin());

create policy access_requests_read on public.access_requests for select to authenticated
  using (user_id = auth.uid() or public.has_permission(institution_id, 'requests.read'));

create policy alumni_profiles_read on public.alumni_profiles for select to authenticated
  using (
    user_id = auth.uid()
    or public.has_permission(institution_id, 'records.read')
    or (status = 'active' and visibility = 'members' and public.has_permission(institution_id, 'directory.use'))
  );

create policy alumni_private_read on public.alumni_private for select to authenticated
  using (public.owns_profile(profile_id) or public.has_permission(institution_id, 'records.read'));

-- Email and phone rows are never readable by other members: they are revealed one profile at a time
-- by initiate_contact().
create policy contact_channels_read on public.profile_contact_channels for select to authenticated
  using (
    public.owns_profile(profile_id)
    or public.has_permission(institution_id, 'records.read')
    or (is_public and type not in ('email', 'phone')
        and public.profile_is_visible(profile_id) and public.has_permission(institution_id, 'directory.use'))
  );

create policy education_read on public.alumni_education for select to authenticated
  using (
    public.owns_profile(profile_id) or public.has_permission(institution_id, 'records.read')
    or (public.profile_is_visible(profile_id) and public.has_permission(institution_id, 'directory.use'))
  );

create policy experience_read on public.alumni_experience for select to authenticated
  using (
    public.owns_profile(profile_id) or public.has_permission(institution_id, 'records.read')
    or (public.profile_is_visible(profile_id) and public.has_permission(institution_id, 'directory.use'))
  );

create policy profile_offers_read on public.profile_offers for select to authenticated
  using (
    public.owns_profile(profile_id) or public.has_permission(institution_id, 'records.read')
    or (public.profile_is_visible(profile_id) and public.has_permission(institution_id, 'directory.use'))
  );

create policy contact_events_read on public.contact_events for select to authenticated
  using (initiator_user_id = auth.uid() or public.has_permission(institution_id, 'metrics.read'));

create policy confirmation_requests_read on public.confirmation_requests for select to authenticated
  using (public.owns_profile(profile_id) or public.has_permission(institution_id, 'freshness.read'));

create policy profile_confirmations_read on public.profile_confirmations for select to authenticated
  using (public.owns_profile(profile_id) or public.has_permission(institution_id, 'freshness.read'));

create policy email_templates_read on public.email_templates for select to authenticated
  using (
    (institution_id is null and auth.uid() is not null)
    or public.has_permission(institution_id, 'templates.manage')
    or public.is_system_admin()
  );

create policy email_outbox_read on public.email_outbox for select to authenticated
  using (public.has_permission(institution_id, 'records.read') or public.is_system_admin());

create policy email_events_read on public.email_events for select to authenticated
  using (public.is_system_admin());

create policy email_suppressions_read on public.email_suppressions for select to authenticated
  using (public.is_system_admin());

create policy consents_read on public.consents for select to authenticated
  using (user_id = auth.uid() or public.has_permission(institution_id, 'records.read'));

create policy audit_log_read on public.audit_log for select to authenticated
  using (public.has_permission(institution_id, 'audit.read') or public.is_system_admin());

create policy exports_read on public.exports for select to authenticated
  using (requested_by = auth.uid() and public.has_permission(institution_id, 'records.export'));

create policy job_runs_read on public.job_runs for select to authenticated
  using (public.is_system_admin());

-- rate_limit_counters: no policy, so no client can read it.

-- Grants -----------------------------------------------------------------------------------------------
-- Supabase grants everything on new objects to anon and authenticated by default. Take it all back:
-- anon gets nothing on tables, authenticated gets SELECT only (filtered by the policies above).

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
grant select on all tables in schema public to authenticated;

revoke execute on all functions in schema public from public, anon, authenticated;
-- Policies run with the caller's privileges, so the helpers they call must be executable. They only
-- answer questions about the caller.
grant execute on function
  public.is_system_admin(), public.has_active_grant(uuid), public.is_member(uuid),
  public.has_permission(uuid, text), public.owns_profile(uuid), public.profile_is_visible(uuid)
  to authenticated;

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
