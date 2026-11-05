import "server-only";
import { required } from "./read";

// Secrets. `server-only` makes importing this file from client code fail the build, so they never reach a browser.
// Never give one a NEXT_PUBLIC_ name.
export const secrets = {
  /** Bypasses RLS: jobs, webhooks and staff invitations only (FND-08). */
  get supabaseSecretKey() {
    return required("SUPABASE_SECRET_KEY", process.env.SUPABASE_SECRET_KEY);
  },
  /** Resend API key (EML-01, ADR 0007). Every environment sends through Resend, with its own key. */
  get resendApiKey() {
    return required("RESEND_API_KEY", process.env.RESEND_API_KEY);
  },
  /** Bearer token the cron routes require (EML-01). */
  get cronSecret() {
    return required("CRON_SECRET", process.env.CRON_SECRET);
  },
};
