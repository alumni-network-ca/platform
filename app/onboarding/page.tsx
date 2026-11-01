import { redirect } from "next/navigation";
import { requireAccess } from "@/lib/auth/account";
import { homeFor } from "@/lib/auth/home";
import { resumeStep } from "@/lib/profile/fields";

// The wizard's entry point (ONB-05): back to the step after the last one saved, or home once it is complete.
export default async function OnboardingPage() {
  const { school, supabase, user, state } = await requireAccess("/onboarding");
  const { data: profile, error } = await supabase
    .from("alumni_profiles")
    .select("onboarding_step, onboarding_completed_at")
    .eq("institution_id", school.id)
    .eq("user_id", user.id)
    .single();
  // A failed read shows an error page rather than redirecting somewhere that may redirect back.
  if (error) throw new Error(`Could not load the profile: ${error.message}`);
  if (profile.onboarding_completed_at) redirect(homeFor(state));
  redirect(`/onboarding/${resumeStep(profile.onboarding_step)}`);
}
