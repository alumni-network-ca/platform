import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/config/env/public";
import type { Database } from "@/lib/database";

export function createClient() {
  return createBrowserClient<Database>(publicEnv.supabaseUrl, publicEnv.supabasePublishableKey);
}
