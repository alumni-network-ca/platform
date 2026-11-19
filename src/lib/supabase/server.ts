import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnv } from "@/config/env/public";
import type { Database } from "@/lib/database";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    publicEnv.supabaseUrl,
    publicEnv.supabasePublishableKey,
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
            // Server Components cannot write cookies. That is safe because proxy.ts refreshes the session
            // and writes the cookies before any page renders; actions and route handlers can write here.
          }
        },
      },
    }
  );
}
