import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { OnboardingClient } from "@/components/OnboardingClient";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingPage(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect("/login?next=/onboarding");

  const {data:profile}=await supabase.from("alumni_profiles").select("id").eq("user_id",user.id).maybeSingle();
  if(profile)redirect("/me");

  const {data:membership}=await supabase.from("institution_memberships").select("institution_id,role").eq("user_id",user.id).maybeSingle();
  const isAdmin=membership?.role==="super_admin"||membership?.role==="institution_admin";

  return <><Nav/><main className="page onboardingPage"><OnboardingClient isAdmin={Boolean(isAdmin)} institutionId={membership?.institution_id||null} email={user.email||""}/></main></>;
}
