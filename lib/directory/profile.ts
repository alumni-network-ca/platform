import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { requireAccess } from "@/lib/auth/account";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * An alumnus's profile as other alumni see it (DIR-03): only a published profile at this school, anything else is a
 * 404, even for staff whose RLS could read hidden records. The route's layout calls it so the 404 is decided before
 * the loading skeleton streams (after that the status is fixed at 200); the page calls it again for the row, which
 * cache() reads once per request.
 */
export const publishedProfile = cache(async (id: string) => {
  const account = await requireAccess(`/profile/${id}`);
  if (!UUID.test(id)) notFound();
  const { data, error } = await account.supabase
    .from("alumni_profiles")
    .select(
      "id, user_id, first_name, last_name, preferred_name, grad_year, city, country, bio, job_title, employer, career_field_id, languages, last_confirmed_at",
    )
    .eq("id", id)
    .eq("institution_id", account.school.id)
    .eq("status", "active")
    .eq("visibility", "members")
    .maybeSingle();
  if (error) throw new Error(`Could not load the profile: ${error.message}`);
  if (!data) notFound();
  return { ...account, profile: data };
});
