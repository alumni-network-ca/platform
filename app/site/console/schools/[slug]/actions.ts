"use server";

import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/lib/auth/platform";
import { schoolUrl } from "@/lib/tenant/address";
import { getOrigin } from "@/lib/tenant/server";

export type InvitationResult = {
  error: string | null;
  /** A fresh invitation link to copy, and who it is for. Shown once. */
  link?: { url: string; email: string };
};

/**
 * S1.3: invite a school admin, get a new link for an open invitation, or revoke one. Emails are not sent yet
 * (EML-01), so the console shows the link for the platform admin to send. It only works for the invited address.
 */
export async function manageInvitation(
  _: InvitationResult,
  form: FormData,
): Promise<InvitationResult> {
  const slug = String(form.get("slug") ?? "");
  const { supabase } = await requirePlatformAdmin(`/console/schools/${slug}`);
  const intent = String(form.get("intent") ?? "");
  let invitation = String(form.get("invitation") ?? "");
  let email = String(form.get("email") ?? "")
    .trim()
    .toLowerCase();

  const { data: school } = await supabase
    .from("institutions")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!school) return { error: "That school no longer exists." };

  if (intent === "revoke") {
    const { error } = await supabase.rpc("revoke_staff_invitation", { p_invitation: invitation });
    revalidatePath(`/console/schools/${slug}`);
    return { error: error ? "That invitation is no longer open." : null };
  }

  if (intent === "invite") {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      return { error: "Enter the person's email address." };
    const { data, error } = await supabase.rpc("platform_appoint_school_admin", {
      p_inst: school.id,
      p_email: email,
    });
    if (error || !data) return { error: "Could not create the invitation. Please try again." };
    invitation = data;
  } else if (intent === "link") {
    const { data } = await supabase
      .from("staff_invitations")
      .select("email")
      .eq("id", invitation)
      .maybeSingle();
    email = data?.email ?? "";
  } else {
    return { error: "Unknown action." };
  }

  const { data: token, error } = await supabase.rpc("issue_staff_invitation_link", {
    p_invitation: invitation,
  });
  revalidatePath(`/console/schools/${slug}`);
  if (error || !token) return { error: "That invitation is no longer open." };
  const url = schoolUrl(await getOrigin(), slug, `/staff/accept?token=${token}`);
  return { error: null, link: { url, email } };
}
