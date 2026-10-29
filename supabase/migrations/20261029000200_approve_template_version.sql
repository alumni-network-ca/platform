-- Approve the submitted text in one transaction. The draft upsert holds the row lock until approval,
-- so concurrent editors cannot approve one another's text between two separate client requests.
create function public.approve_email_template_version(
 p_inst uuid, p_key public.email_template_key, p_locale public.locale, p_subject text, p_body text
) returns void language plpgsql security definer set search_path = '' as $$
begin
 perform public.assert_permission(p_inst, 'templates.manage');
 perform public.save_email_template(p_inst, p_key, p_locale, p_subject, p_body);
 perform public.approve_email_template(p_inst, p_key, p_locale);
end $$;
revoke all on function public.approve_email_template_version(uuid, public.email_template_key, public.locale, text, text) from public, anon;
grant execute on function public.approve_email_template_version(uuid, public.email_template_key, public.locale, text, text) to authenticated;
