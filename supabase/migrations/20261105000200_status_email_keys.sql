-- EML-08: template keys for the status emails. A new enum value can't be used in the transaction that adds it,
-- so the templates and the RPCs that queue them are in the next migration.
alter type public.email_template_key add value if not exists 'access_received';
alter type public.email_template_key add value if not exists 'access_withdrawn';
alter type public.email_template_key add value if not exists 'membership_suspended';
alter type public.email_template_key add value if not exists 'membership_reactivated';
