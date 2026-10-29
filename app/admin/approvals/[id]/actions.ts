"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth/staff";
import { actionError, field, type ActionResult } from "@/lib/admin/forms";
export async function decideRequest(
  id: string,
  _: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const { supabase, school } = await requireStaff("/admin/approvals/" + id, "requests.decide");
  const { data, error: lookupError } = await supabase
    .from("access_requests")
    .select("id")
    .eq("institution_id", school.id)
    .eq("id", id)
    .maybeSingle();
  if (lookupError) return actionError(lookupError);
  if (!data) return { error: "forbidden" };
  const decision = field(form, "decision");
  if (!["approve", "needs_info", "reject"].includes(decision)) return { error: "invalid" };
  const reason =
    decision === "reject"
      ? field(form, "reject_reason") === "other"
        ? field(form, "other_reason")
        : field(form, "reject_reason")
      : field(form, "question");
  if (decision !== "approve" && !reason) return { error: "invalid" };
  const { error } = await supabase.rpc("decide_access_request", {
    p_request: id,
    p_decision: decision,
    p_reason: reason || undefined,
    p_link_profile: decision === "approve" ? field(form, "profile") || undefined : undefined,
  });
  if (error) return actionError(error);
  revalidatePath("/admin", "layout");
  redirect("/admin/approvals?tab=" + (decision === "needs_info" ? "needs_info" : "decided"));
}
