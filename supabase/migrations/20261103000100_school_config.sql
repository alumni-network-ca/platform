-- What every page of a school needs and almost nobody changes, in one read the app caches across requests and
-- visitors (lib/tenant/config.ts): branding, career fields, networking options and the role → permission table.
-- 1. school_config is public like public_school, because the cache is shared and never carries a session. None of it
--    is personal data. Only an active school's config comes back.
-- 2. update_school_settings cleans branding the way platform_create_school does. Branding reaches every page now, so a
--    school admin calling the RPC directly must not store keys or values clean_branding would refuse.

create function public.school_config(p_inst uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'branding', i.branding,
    -- Platform rows and this school's own, inactive ones included: profiles still show a retired option's label.
    'career_fields', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'key', c.key, 'label_en', c.label_en, 'label_fr', c.label_fr,
               'institution_id', c.institution_id, 'is_active', c.is_active, 'sort_order', c.sort_order)
             order by c.sort_order, c.key)
      from public.career_fields c where c.institution_id is null or c.institution_id = i.id), '[]'::jsonb),
    'offer_types', coalesce((
      select jsonb_agg(jsonb_build_object('id', o.id, 'key', o.key, 'label_en', o.label_en, 'label_fr', o.label_fr,
               'institution_id', o.institution_id, 'is_active', o.is_active, 'sort_order', o.sort_order)
             order by o.sort_order, o.key)
      from public.offer_types o where o.institution_id is null or o.institution_id = i.id), '[]'::jsonb),
    'role_permissions', coalesce((
      select jsonb_object_agg(r.role, r.permissions)
      from (select role, jsonb_agg(permission order by permission) as permissions
            from public.role_permissions group by role) r), '{}'::jsonb)
  )
  from public.institutions i where i.id = p_inst and i.status = 'active';
$$;

create or replace function public.update_school_settings(p_inst uuid, p_patch jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_permission(p_inst, 'settings.manage');
  update public.institutions set
    email_display_name = case when p_patch ? 'email_display_name' then nullif(trim(p_patch ->> 'email_display_name'), '') else email_display_name end,
    reply_to_email = case when p_patch ? 'reply_to_email' then nullif(lower(trim(p_patch ->> 'reply_to_email')), '') else reply_to_email end,
    default_locale = case when p_patch ? 'default_locale' then (p_patch ->> 'default_locale')::public.locale else default_locale end,
    branding = case when p_patch ? 'branding' then public.clean_branding(p_patch -> 'branding') else branding end,
    confirmation_interval_months = case when p_patch ? 'confirmation_interval_months'
      then (p_patch ->> 'confirmation_interval_months')::int else confirmation_interval_months end
  where id = p_inst;
  perform public.log_audit(p_inst, 'school.settings_updated', 'institution', p_inst::text,
    jsonb_build_object('fields', (select jsonb_agg(k) from jsonb_object_keys(p_patch) k)));
end $$;

revoke execute on function public.school_config(uuid) from public;
grant execute on function public.school_config(uuid) to anon, authenticated;
