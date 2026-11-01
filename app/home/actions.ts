"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAccess } from "@/lib/auth/account";

// The home page's "Yes, still accurate" answer (DIR-06, FRS): one confirm_still_accurate_in_app call, which
// checks again in the database that the profile is the caller's own, active and onboarded.
export async function confirmStillAccurate() {
  const { school, supabase } = await requireAccess("/home");
  const { error } = await supabase.rpc("confirm_still_accurate_in_app", { p_inst: school.id });
  if (error) redirect("/home?confirm=failed");
  revalidatePath("/home");
  redirect("/home?confirm=done");
}
