# Confirmation emails on hosted deployments

Signup shows “Check your inbox” after Supabase accepts the request. Email confirmation is still required before the applicant can submit a school access request. Confirmation and password recovery links use the host that served the request; shared Vercel previews also retain the school selector.

If an email returns to localhost, check the **hosted Supabase project's Authentication → URL Configuration**:

1. Set **Site URL** to the public deployment URL, including its temporary custom domain while that domain is in use.
2. Add that deployment's `/auth/confirm` callback to **Redirect URLs**, including the query parameters used by confirmation and recovery. For staging or preview environments, an entry such as `https://<actual-preview-domain>/**` covers both flows and the preview school selector. Scope any Vercel wildcard to the project's team/account.
3. In **Email Templates → Confirm signup**, install `supabase/templates/confirm-account.html`. It uses `.RedirectTo` and `.TokenHash` to verify the email through the app's callback, including when opened on another device. Install `supabase/templates/reset-password.html` for password recovery too.
4. Request a fresh confirmation email and verify its destination. An expired or previously used link will still fail.

Changing the local `supabase/config.toml` does not change the hosted project's settings. See [Supabase redirect URL configuration](https://supabase.com/docs/guides/auth/redirect-urls) and [email templates](https://supabase.com/docs/guides/auth/auth-email-templates).
