"use server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/staff";
import { schoolUrl } from "@/lib/tenant/address";
import { getOrigin } from "@/lib/tenant/server";
import { actionError, field, type ActionResult } from "@/lib/admin/forms";
export async function manageStaff(_: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase, school } = await requireStaff("/admin/staff", "staff.manage");
  const operation = field(form, "operation");
  const role = field(form, "role");
  if (
    (operation === "invite" || operation === "role") &&
    role !== "school_admin" &&
    role !== "reviewer"
  )
    return { error: "invalid" };
  let invitation = field(form, "invitation");
  if (operation === "invite") {
    const { data, error } = await supabase.rpc("invite_staff", {
      p_inst: school.id,
      p_email: field(form, "email"),
      p_role: role as "school_admin" | "reviewer",
    });
    if (error) return actionError(error);
    invitation = data;
  } else if (operation === "role" || operation === "remove") {
    const result =
      operation === "role"
        ? await supabase.rpc("change_staff_role", {
            p_inst: school.id,
            p_user: field(form, "user"),
            p_role: role as "school_admin" | "reviewer",
          })
        : await supabase.rpc("remove_staff", { p_inst: school.id, p_user: field(form, "user") });
    if (result.error) return actionError(result.error);
    revalidatePath("/admin", "layout");
    return { error: null, saved: true };
  } else if (operation !== "resend" && operation !== "revoke") return { error: "invalid" };
  // IDs from the form are checked against the host's school before the ID-based RPC.
  const { data: scoped, error: lookupError } = await supabase
    .from("staff_invitations")
    .select("id")
    .eq("institution_id", school.id)
    .eq("id", invitation)
    .maybeSingle();
  if (lookupError) return actionError(lookupError);
  if (!scoped) return { error: "forbidden" };
  if (operation === "revoke") {
    const { error } = await supabase.rpc("revoke_staff_invitation", { p_invitation: invitation });
    if (error) return actionError(error);
    revalidatePath("/admin", "layout");
    return { error: null, saved: true };
  }
  const { data: token, error } = await supabase.rpc("issue_staff_invitation_link", {
    p_invitation: invitation,
  });
  revalidatePath("/admin", "layout");
  if (error) return actionError(error);
  // TODO(EML-01): send through the outbox worker; until then show a copyable invitation link.
  const link = new URL(schoolUrl(await getOrigin(), school.slug, "/staff/accept"));
  link.searchParams.set("token", token);
  return { error: null, saved: true, link: link.toString() };
}
