import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "@/config/env/public";
import type { Database } from "@/lib/database";

// Signed-out client for the public reads (public_school, school_config). It never carries a user's session, so what
// it reads is the same for every visitor and safe to cache across them. No `server-only` marker, because proxy.ts
// imports it. Created on first use, so a missing Supabase variable fails the request that needs it, not the module load.
let anon: SupabaseClient<Database> | undefined;

export function anonClient() {
  anon ??= createClient<Database>(publicEnv.supabaseUrl, publicEnv.supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return anon;
}
