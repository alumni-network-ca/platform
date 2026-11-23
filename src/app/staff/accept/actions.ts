"use server";

import { requireAccess } from "@/lib/auth/account";

export type AcceptResult = { failed: boolean; next?: string };

/**
 * Accepts a staff invitation for the signed-in account: by its link's token, or without one by the account's
 * confirmed email (ADR 0016). Both RPCs check the email matches the invited one.
 */
export async function acceptInvitation(_: AcceptResult, form: FormData): Promise<AcceptResult> {
  const { supabase, school } = await requireAccess("/staff/accept");
  const token = String(form.get("token") ?? "");
  const { error } = token
    ? await supabase.rpc("accept_staff_invitation", { p_token: token })
    : await supabase.rpc("accept_my_staff_invitation", { p_inst: school.id });
  if (error) return { failed: true };
  // TODO(FND-11): two-factor enrolment (A6.5) before the first admin page.
  return { failed: false, next: "/admin?welcome=1" };
}
