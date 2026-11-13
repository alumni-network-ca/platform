"use server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/staff";
import { invitationUrl } from "@/lib/staff/invitation";
import { actionError, field, type ActionResult } from "@/lib/admin/forms";
export async function manageStaff(_: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase, school } = await requireStaff("/admin/staff", "staff.manage");
  const operation = field(form, "operation");
  const role = field(form, "role");
  if (operation === "role" && role !== "school_admin" && role !== "reviewer")
    return { error: "invalid" };
  if (operation === "role" || operation === "remove") {
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
  }
  if (operation !== "resend" && operation !== "revoke" && operation !== "reinvite")
    return { error: "invalid" };
  // IDs from the form are checked against the host's school before the ID-based RPC.
  const { data: scoped, error: lookupError } = await supabase
    .from("staff_invitations")
    .select("id, email, role")
    .eq("institution_id", school.id)
    .eq("id", field(form, "invitation"))
    .maybeSingle();
  if (lookupError) return actionError(lookupError);
  if (!scoped) return { error: "forbidden" };
  if (operation === "revoke") {
    const { error } = await supabase.rpc("revoke_staff_invitation", { p_invitation: scoped.id });
    if (error) return actionError(error);
    revalidatePath("/admin", "layout");
    return { error: null, saved: true };
  }
  let invitation = scoped.id;
  // An expired invitation can't get a new link: invite the same address and role again.
  if (operation === "reinvite") {
    const { data, error } = await supabase.rpc("invite_staff", {
      p_inst: school.id,
      p_email: scoped.email,
      p_role: scoped.role,
    });
    if (error) return actionError(error);
    invitation = data;
  }
  const { data: token, error } = await supabase.rpc("issue_staff_invitation_link", {
    p_invitation: invitation,
  });
  revalidatePath("/admin", "layout");
  if (error) return actionError(error);
  return { error: null, saved: true, link: await invitationUrl(school.slug, token) };
}
