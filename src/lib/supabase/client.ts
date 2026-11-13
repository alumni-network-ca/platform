import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "@/config/env/public";
import type { Database } from "@/lib/database";

export function createClient() {
  return createBrowserClient<Database>(publicEnv.supabaseUrl, publicEnv.supabasePublishableKey);
}

// Untyped escape for the components still written against the legacy schema; their queries fail on v2
// until M2 rewires them. eslint.config.mjs lists the only files allowed to import it.
export function createLegacyClient() {
  return createClient() as unknown as SupabaseClient;
}
