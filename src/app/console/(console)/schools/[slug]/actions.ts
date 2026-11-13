"use server";

import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/lib/auth/platform";
import { invitationUrl } from "@/lib/staff/invitation";

type StaffRole = "school_admin" | "reviewer";

export type InvitationResult = {
  error: string | null;
  /** A fresh invitation link to copy, who it is for and their role. Shown once. */
  link?: { url: string; email: string; role: StaffRole };
};

/**
 * S1.3: invite a school admin or a reviewer, get a new link for an open invitation, or revoke one. Emails are not
 * sent yet (EML-01), so the console shows the link for the platform admin to send. It only works for the invited
 * address.
 */
export async function manageInvitation(
  _: InvitationResult,
  form: FormData,
): Promise<InvitationResult> {
  const slug = String(form.get("slug") ?? "");
  const { supabase } = await requirePlatformAdmin(`/schools/${slug}`);
  const intent = String(form.get("intent") ?? "");

  const { data: school } = await supabase
    .from("institutions")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!school) return { error: "That school no longer exists." };

  let invitation: { id: string; email: string; role: StaffRole };

  if (intent === "invite") {
    const email = String(form.get("email") ?? "")
      .trim()
      .toLowerCase();
    const role = String(form.get("role") ?? "");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      return { error: "Enter the person's email address." };
    if (role !== "school_admin" && role !== "reviewer") return { error: "Choose a role." };
    const { data, error } = await supabase.rpc("platform_invite_staff", {
      p_inst: school.id,
      p_email: email,
      p_role: role,
    });
    if (error || !data) return { error: "Could not create the invitation. Try again." };
    invitation = { id: data, email, role };
  } else if (intent === "link" || intent === "revoke") {
    // IDs from the form are checked against this school before the ID-based RPC.
    const { data } = await supabase
      .from("staff_invitations")
      .select("id, email, role")
      .eq("institution_id", school.id)
      .eq("id", String(form.get("invitation") ?? ""))
      .maybeSingle();
    if (!data || (data.role !== "school_admin" && data.role !== "reviewer"))
      return { error: "That invitation is no longer open." };
    invitation = { id: data.id, email: data.email, role: data.role };
    if (intent === "revoke") {
      const { error } = await supabase.rpc("revoke_staff_invitation", {
        p_invitation: invitation.id,
      });
      revalidatePath(`/console/schools/${slug}`);
      return { error: error ? "That invitation is no longer open." : null };
    }
  } else {
    return { error: "Unknown action." };
  }

  const { data: token, error } = await supabase.rpc("issue_staff_invitation_link", {
    p_invitation: invitation.id,
  });
  revalidatePath(`/console/schools/${slug}`);
  if (error || !token) return { error: "That invitation is no longer open." };
  return {
    error: null,
    link: { url: await invitationUrl(slug, token), email: invitation.email, role: invitation.role },
  };
}
