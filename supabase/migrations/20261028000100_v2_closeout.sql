-- M1 database close-out (FND-06, FND-12, FND-13).

-- withdraw_consent wrote a 'consent.withdrawn' row into the audit log of any school, even for a caller with no
-- consent there (found by the cross-school RPC matrix, FND-06). It now refuses when there is nothing to withdraw.
create or replace function public.withdraw_consent(p_inst uuid, p_document public.consent_document) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.consents set withdrawn_at = now()
  where institution_id = p_inst and user_id = auth.uid() and document = p_document and withdrawn_at is null;
  if not found then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_document = 'directory_publication' then
    update public.alumni_profiles set visibility = 'hidden' where institution_id = p_inst and user_id = auth.uid();
  end if;
  perform public.log_audit(p_inst, 'consent.withdrawn', 'consent', p_document::text);
end $$;

-- Makes a verified account a system admin (FND-13). Run once per environment by
-- scripts/admin/bootstrap-platform-admin.ts with the secret key; never callable from the app. Idempotent: an
-- existing system admin is returned unchanged and nothing is audited.
create function public.platform_add_admin(p_email text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid;
begin
  select id into v_user from auth.users
  where lower(email) = lower(trim(p_email)) and email_confirmed_at is not null;
  if v_user is null then
    raise exception 'no verified account for %', p_email using errcode = 'P0002';
  end if;
  insert into public.platform_admins (user_id) values (v_user) on conflict (user_id) do nothing;
  if found then
    perform public.log_audit(null, 'platform.admin_added', 'user', v_user::text);
  end if;
  return v_user;
end $$;

revoke execute on function public.platform_add_admin(text) from public, anon, authenticated;
grant execute on function public.platform_add_admin(text) to service_role;
