-- POST-04: the template key for the "a new post is up" email. A new enum value can't be used in the transaction
-- that adds it, so the templates and the RPCs that queue it are in the next migration.
alter type public.email_template_key add value if not exists 'post_published';
