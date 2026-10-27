import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { OnboardingClient } from "@/components/OnboardingClient";
// Legacy schema until ONB-05 (#108) rewires it.
import { createLegacyClient as createClient } from "@/lib/supabase/server";
import { requireAccess } from "@/lib/auth/account";

export default async function OnboardingPage() {
  await requireAccess("/onboarding");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/onboarding");
  const { data: profile } = await supabase
    .from("alumni_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profile?.onboarding_completed_at) redirect("/me");
  const { data: membership } = await supabase
    .from("institution_memberships")
    .select("institution_id,role")
    .eq("user_id", user.id)
    .maybeSingle();
  const isAdmin = membership?.role === "super_admin" || membership?.role === "institution_admin";
  return (
    <>
      <Nav />
      <main className="page onboardingPage">
        <OnboardingClient
          isAdmin={Boolean(isAdmin)}
          institutionId={membership?.institution_id || profile?.institution_id || null}
          email={user.email || ""}
          existing={profile || null}
        />
      </main>
    </>
  );
}
