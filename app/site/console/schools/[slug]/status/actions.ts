"use server";

import { redirect } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/auth/platform";

export type StatusResult = { error: string | null };

/** S2.2: suspend or reactivate a school. The slug typed back confirms which school. */
export async function setSchoolStatus(_: StatusResult, form: FormData): Promise<StatusResult> {
  const slug = String(form.get("slug") ?? "");
  const { supabase } = await requirePlatformAdmin(`/console/schools/${slug}/status`);
  const status = form.get("status") === "active" ? "active" : "suspended";
  const reason = String(form.get("reason") ?? "").trim();
  if (String(form.get("confirm") ?? "").trim() !== slug)
    return { error: `Type ${slug} to confirm.` };
  if (status === "suspended" && !reason) return { error: "Say why the school is suspended." };

  const { data: school } = await supabase
    .from("institutions")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!school) return { error: "That school no longer exists." };
  const { error } = await supabase.rpc("platform_set_school_status", {
    p_inst: school.id,
    p_status: status,
    p_reason: reason || undefined,
  });
  if (error) return { error: "The school's status did not change. Reload the page and try again." };
  redirect(`/console/schools/${slug}`);
}
