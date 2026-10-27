import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        // The no-cache headers @supabase/ssr passes as a second argument are applied by the session
        // proxy (FND-08, #94); Server Components and actions only forward the cookies.
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Components cannot always write cookies.
          }
        },
      },
    }
  );
}

// Untyped escape for the pages still written against the legacy schema; their queries fail on v2 until
// M2 rewires them. eslint.config.mjs lists the only files allowed to import it.
export async function createLegacyClient() {
  return (await createClient()) as unknown as SupabaseClient;
}
