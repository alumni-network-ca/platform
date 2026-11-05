import "server-only";
import { required } from "./read";

// Secrets. `server-only` makes importing this file from client code fail the build, so they never reach a browser.
// Never give one a NEXT_PUBLIC_ name.
export const secrets = {
  /** Bypasses RLS: jobs, webhooks and staff invitations only (FND-08). */
  get supabaseSecretKey() {
    return required("SUPABASE_SECRET_KEY", process.env.SUPABASE_SECRET_KEY);
  },
  /** Resend API key (EML-01, ADR 0007). Unset locally and in CI, where email goes to Mailpit over SMTP. */
  get resendApiKey() {
    return process.env.RESEND_API_KEY || undefined;
  },
  /** SMTP server for local development and CI: Mailpit, smtp://127.0.0.1:54325. Ignored when Resend is set. */
  get emailSmtpUrl() {
    return process.env.EMAIL_SMTP_URL || undefined;
  },
  /** Bearer token the cron routes require (EML-01). */
  get cronSecret() {
    return required("CRON_SECRET", process.env.CRON_SECRET);
  },
};
