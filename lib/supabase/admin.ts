import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/config/env/public";
import { secrets } from "@/config/env/secrets";
import type { Database } from "@/lib/database";

// Secret-key client: bypasses RLS. Only for jobs, webhooks and staff invitations, never for a page acting on a
// user's behalf. `server-only` makes importing this module from client code fail the build (FND-08).
export function createAdminClient() {
  return createClient<Database>(publicEnv.supabaseUrl, secrets.supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
