import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireSchool } from "@/lib/tenant/server";
import { canOpen, homeFor, type AccountState } from "./home";

/**
 * The signed-in person and their state at the school of this address, read through RLS (each person sees
 * only their own membership, profile and requests). A failed query throws instead of guessing a state, so a
 * database error shows an error page rather than sending someone to the wrong page.
 */
export async function getAccount() {
  const school = await requireSchool();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { school, supabase, user: null, state: null };

  const [membership, profile, request] = await Promise.all([
    supabase
      .from("institution_memberships")
      .select("role, status")
      .eq("institution_id", school.id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("alumni_profiles")
      .select("status, onboarding_completed_at")
      .eq("institution_id", school.id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("access_requests")
      .select("status")
      .eq("institution_id", school.id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const error = membership.error ?? profile.error ?? request.error;
  if (error) throw new Error(`Could not load the account: ${error.message}`);

  const state: AccountState = {
    membership: membership.data,
    profile: profile.data && {
      status: profile.data.status,
      onboardingComplete: profile.data.onboarding_completed_at !== null,
    },
    request: request.data?.status ?? null,
  };
  return { school, supabase, user, state };
}

/**
 * Page guard: a signed-out visitor goes to sign-in and comes back to `path`; a signed-in person who may not
 * open `path` goes to their home page. Server-side, so it holds for direct requests too.
 */
export async function requireAccess(path: string) {
  const account = await getAccount();
  if (!account.user) redirect(`/login?next=${encodeURIComponent(path)}`);
  if (!canOpen(account.state, path)) redirect(homeFor(account.state));
  return account;
}
