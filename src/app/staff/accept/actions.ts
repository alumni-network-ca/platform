"use server";

import { requireAccess } from "@/lib/auth/account";

export type AcceptResult = { failed: boolean; next?: string };

/** Accepts a staff invitation for the signed-in account (accept_staff_invitation checks the email matches). */
export async function acceptInvitation(_: AcceptResult, form: FormData): Promise<AcceptResult> {
  const { supabase } = await requireAccess("/staff/accept");
  const { error } = await supabase.rpc("accept_staff_invitation", {
    p_token: String(form.get("token") ?? ""),
  });
  if (error) return { failed: true };
  // TODO(FND-11): two-factor enrolment (A6.5) before the first admin page.
  return { failed: false, next: "/admin?welcome=1" };
}
