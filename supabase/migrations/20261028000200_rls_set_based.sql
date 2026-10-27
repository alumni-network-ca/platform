-- Set-based RLS (DIR-01, QA-06). The read policies called has_permission(institution_id, …),
-- owns_profile(profile_id) and profile_is_visible(profile_id) once per row. Security definer functions are never
-- inlined, so a directory search over 10,000 profiles ran about 20,000 permission checks and took over 3 s; the
-- offer and school filters timed out. The policies now test membership in sets that are computed once per
-- statement. Who can read what is unchanged: the sets reuse has_permission, and the pgTAP suites still pass.

-- Schools where the caller holds p_perm: has_permission once per school instead of once per row.
create function public.permitted_institutions(p_perm text) returns setof uuid
language sql stable security definer set search_path = '' rows 5 as $$
  select id from public.institutions where public.has_permission(id, p_perm);
$$;

-- The caller's own profiles (at most one per school).
create function public.my_profile_ids() returns setof uuid
language sql stable security definer set search_path = '' rows 2 as $$
  select id from public.alumni_profiles where user_id = auth.uid();
$$;

-- Published, active profiles at the schools whose directory the caller may use.
create function public.directory_profile_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select id from public.alumni_profiles
  where status = 'active' and visibility = 'members'
    and institution_id in (select public.permitted_institutions('directory.use'));
$$;

revoke execute on function public.permitted_institutions(text), public.my_profile_ids(), public.directory_profile_ids()
  from public, anon;
grant execute on function public.permitted_institutions(text), public.my_profile_ids(), public.directory_profile_ids()
  to authenticated;

-- auth.uid() and is_system_admin() are wrapped in a subquery so they are evaluated once, not per row.

alter policy platform_admins_read on public.platform_admins
  using ((select public.is_system_admin()));
alter policy platform_access_grants_read on public.platform_access_grants
  using ((select public.is_system_admin()) or institution_id in (select public.permitted_institutions('audit.read')));
alter policy memberships_read on public.institution_memberships
  using (
    user_id = (select auth.uid())
    or institution_id in (select public.permitted_institutions('records.read'))
    or (select public.is_system_admin())
  );
alter policy staff_invitations_read on public.staff_invitations
  using (institution_id in (select public.permitted_institutions('staff.manage')) or (select public.is_system_admin()));
alter policy user_preferences_read on public.user_preferences
  using (user_id = (select auth.uid()));
alter policy access_requests_read on public.access_requests
  using (user_id = (select auth.uid()) or institution_id in (select public.permitted_institutions('requests.read')));
alter policy alumni_profiles_read on public.alumni_profiles
  using (
    user_id = (select auth.uid())
    or institution_id in (select public.permitted_institutions('records.read'))
    or (status = 'active' and visibility = 'members'
        and institution_id in (select public.permitted_institutions('directory.use')))
  );
alter policy alumni_private_read on public.alumni_private
  using (
    profile_id in (select public.my_profile_ids())
    or institution_id in (select public.permitted_institutions('records.read'))
  );
-- Email and phone rows are still never readable by other members (initiate_contact reveals them).
alter policy contact_channels_read on public.profile_contact_channels
  using (
    profile_id in (select public.my_profile_ids())
    or institution_id in (select public.permitted_institutions('records.read'))
    or (is_public and type not in ('email', 'phone') and profile_id in (select public.directory_profile_ids()))
  );
alter policy education_read on public.alumni_education
  using (
    profile_id in (select public.my_profile_ids())
    or institution_id in (select public.permitted_institutions('records.read'))
    or profile_id in (select public.directory_profile_ids())
  );
alter policy experience_read on public.alumni_experience
  using (
    profile_id in (select public.my_profile_ids())
    or institution_id in (select public.permitted_institutions('records.read'))
    or profile_id in (select public.directory_profile_ids())
  );
alter policy profile_offers_read on public.profile_offers
  using (
    profile_id in (select public.my_profile_ids())
    or institution_id in (select public.permitted_institutions('records.read'))
    or profile_id in (select public.directory_profile_ids())
  );
alter policy contact_events_read on public.contact_events
  using (
    initiator_user_id = (select auth.uid())
    or institution_id in (select public.permitted_institutions('metrics.read'))
  );
alter policy confirmation_requests_read on public.confirmation_requests
  using (
    profile_id in (select public.my_profile_ids())
    or institution_id in (select public.permitted_institutions('freshness.read'))
  );
alter policy profile_confirmations_read on public.profile_confirmations
  using (
    profile_id in (select public.my_profile_ids())
    or institution_id in (select public.permitted_institutions('freshness.read'))
  );
alter policy email_templates_read on public.email_templates
  using (
    (institution_id is null and (select auth.uid()) is not null)
    or institution_id in (select public.permitted_institutions('templates.manage'))
    or (select public.is_system_admin())
  );
alter policy email_outbox_read on public.email_outbox
  using (institution_id in (select public.permitted_institutions('records.read')) or (select public.is_system_admin()));
alter policy email_events_read on public.email_events
  using ((select public.is_system_admin()));
alter policy email_suppressions_read on public.email_suppressions
  using ((select public.is_system_admin()));
alter policy consents_read on public.consents
  using (user_id = (select auth.uid()) or institution_id in (select public.permitted_institutions('records.read')));
alter policy audit_log_read on public.audit_log
  using (institution_id in (select public.permitted_institutions('audit.read')) or (select public.is_system_admin()));
alter policy exports_read on public.exports
  using (requested_by = (select auth.uid()) and institution_id in (select public.permitted_institutions('records.export')));
alter policy job_runs_read on public.job_runs
  using ((select public.is_system_admin()));

-- No policy uses these per-row helpers any more. owns_profile stays for initiate_contact (security definer, so
-- clients no longer need to execute it); profile_is_visible has no caller left.
revoke execute on function public.owns_profile(uuid) from authenticated;
drop function public.profile_is_visible(uuid);
