import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}

// Untyped escape for the components still written against the legacy schema; their queries fail on v2
// until M2 rewires them. eslint.config.mjs lists the only files allowed to import it.
export function createLegacyClient() {
  return createClient() as unknown as SupabaseClient;
}
