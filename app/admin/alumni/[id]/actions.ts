"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { staffRecord } from "@/lib/admin/records";
import { actionError, field, type ActionResult } from "@/lib/admin/forms";
export async function changeStatus(
  id: string,
  _: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const { supabase, profile } = await staffRecord(id, "records.edit");
  const status = field(form, "status");
  const reason = field(form, "reason");
  if (
    !reason ||
    reason.length > 2000 ||
    (profile.status === "active"
      ? !["suspended", "archived", "deceased"].includes(status)
      : status !== "active")
  )
    return { error: "invalid" };
  const { error } = await supabase.rpc("set_profile_status", {
    p_profile: id,
    p_status: status as "active" | "suspended" | "archived" | "deceased",
    p_reason: reason,
  });
  if (error) return actionError(error);
  revalidatePath("/admin", "layout");
  redirect("/admin/alumni/" + id + "?tab=history");
}
export async function editRecord(
  id: string,
  _: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const { supabase } = await staffRecord(id, "records.edit");
  const year = field(form, "grad_year");
  if (
    !/^\d{4}$/.test(year) ||
    +year < 1900 ||
    +year > 2100 ||
    !field(form, "first_name") ||
    !field(form, "last_name")
  )
    return { error: "invalid" };
  const patch: Record<string, string | number> = { grad_year: +year };
  for (const key of [
    "first_name",
    "last_name",
    "preferred_name",
    "city",
    "country",
    "job_title",
    "employer",
    "maiden_name",
    "admin_notes",
    "school_student_id",
  ])
    patch[key] = field(form, key);
  const { error } = await supabase.rpc("admin_update_profile", { p_profile: id, p_patch: patch });
  if (error) return actionError(error);
  revalidatePath("/admin", "layout");
  redirect("/admin/alumni/" + id);
}
