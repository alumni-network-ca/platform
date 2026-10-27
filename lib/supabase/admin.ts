import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database";

// Secret-key client: bypasses RLS. Only for jobs, webhooks and staff invitations, never for a page acting on a
// user's behalf. `server-only` makes importing this module from client code fail the build (FND-08).
export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) throw new Error("SUPABASE_SECRET_KEY is not set.");
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
