"use server";

import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/lib/auth/platform";

export type GrantResult = { error: string | null; opened?: string };

/** S2.1: open a time-boxed support grant (1–8 h, with a reason the school's admins see), or end one early. */
export async function manageGrant(_: GrantResult, form: FormData): Promise<GrantResult> {
  const { supabase } = await requirePlatformAdmin("/console/support");
  if (form.get("intent") === "end") {
    const { error } = await supabase.rpc("platform_revoke_grant", {
      p_grant: String(form.get("grant") ?? ""),
    });
    revalidatePath("/console", "layout");
    return { error: error ? "Only the person who opened a grant can end it." : null };
  }

  const reason = String(form.get("reason") ?? "").trim();
  const hours = Number(form.get("hours"));
  const school = String(form.get("school") ?? "");
  if (reason.length < 5) return { error: "Give a reason of at least 5 characters." };
  if (![1, 4, 8].includes(hours)) return { error: "Choose how long the grant lasts." };
  const { error } = await supabase.rpc("platform_open_grant", {
    p_inst: school,
    p_reason: reason,
    p_hours: hours,
  });
  if (error) return { error: "Could not open the grant. Please try again." };
  revalidatePath("/console", "layout");
  return { error: null, opened: school };
}
