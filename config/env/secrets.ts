import "server-only";
import { required } from "./read";

// Secrets. `server-only` makes importing this file from client code fail the build, so they never reach a browser.
// Never give one a NEXT_PUBLIC_ name.
export const secrets = {
  /** Bypasses RLS: jobs, webhooks and staff invitations only (FND-08). */
  get supabaseSecretKey() {
    return required("SUPABASE_SECRET_KEY", process.env.SUPABASE_SECRET_KEY);
  },
};
