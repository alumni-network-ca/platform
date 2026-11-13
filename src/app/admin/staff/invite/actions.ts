"use server";
import { revalidatePath } from "next/cache";
import type { Enums } from "@/lib/database";
import { requireStaff } from "@/lib/auth/staff";
import { invitationUrl } from "@/lib/staff/invitation";
import { adminCopy, dateLabel } from "@/lib/admin/data";
import { actionError, field, type ActionResult } from "@/lib/admin/forms";

export type InviteResult = {
  error: ActionResult["error"] | "alreadyStaff";
  invited?: { email: string; role: Enums<"member_role">; link: string; expires: string };
};

/** Invites a staff member (A5.1) and returns the link to send by hand while emails are not sent (A5.2). */
export async function inviteStaff(_: InviteResult, form: FormData): Promise<InviteResult> {
  const { supabase, school } = await requireStaff("/admin/staff/invite", "staff.manage");
  const email = field(form, "email").toLowerCase();
  const role = field(form, "role");
  if (role !== "school_admin" && role !== "reviewer") return { error: "invalid" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return { error: "invalid" };
  const { data: staff, error: staffError } = await supabase.rpc("school_staff", {
    p_inst: school.id,
  });
  if (staffError) return actionError(staffError);
  if (staff.some((person) => (person.email ?? "").toLowerCase() === email))
    return { error: "alreadyStaff" };
  const { data: invitation, error } = await supabase.rpc("invite_staff", {
    p_inst: school.id,
    p_email: email,
    p_role: role,
  });
  if (error) return actionError(error);
  const { data: token, error: linkError } = await supabase.rpc("issue_staff_invitation_link", {
    p_invitation: invitation,
  });
  revalidatePath("/admin", "layout");
  if (linkError) return actionError(linkError);
  const [{ locale }, link] = await Promise.all([adminCopy(), invitationUrl(school.slug, token)]);
  const { data: row } = await supabase
    .from("staff_invitations")
    .select("expires_at")
    .eq("id", invitation)
    .maybeSingle();
  return {
    error: null,
    invited: { email, role, link, expires: dateLabel(row?.expires_at ?? null, locale) },
  };
}
