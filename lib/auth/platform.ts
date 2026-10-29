import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * The signed-in platform admin on the root domain (ADR 0005), or null when the visitor is signed out or is not
 * one. Platform admins are listed in platform_admins; the database checks it again in every console RPC.
 */
export const getPlatformAdmin = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: isAdmin, error } = await supabase.rpc("is_system_admin");
  if (error) throw new Error(`Could not check platform access: ${error.message}`);
  return isAdmin ? { supabase, user } : null;
});

/** Console page guard: signed-out visitors sign in and come back to `path`; other accounts see a refusal. */
export async function requirePlatformAdmin(path: string) {
  const admin = await getPlatformAdmin();
  if (admin) return admin;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  redirect(user ? "/console/no-access" : `/login?next=${encodeURIComponent(path)}`);
}
