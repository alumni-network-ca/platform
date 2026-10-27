"use server";

import { redirect } from "next/navigation";
import { requireAccess } from "@/lib/auth/account";

/** The applicant's answer to the school's question; the request goes back to the queue as pending. */
export async function replyToInfoRequest(form: FormData) {
  const { school, supabase, user } = await requireAccess("/account/needs-info");
  const reply = String(form.get("reply") ?? "").trim();
  if (!reply) redirect("/account/needs-info");
  const { data: request, error: readError } = await supabase
    .from("access_requests")
    .select("id")
    .eq("institution_id", school.id)
    .eq("user_id", user.id)
    .eq("status", "needs_info")
    .maybeSingle();
  if (readError) throw new Error(`Could not load the request: ${readError.message}`);
  if (request) {
    const { error } = await supabase.rpc("reply_to_info_request", {
      p_request: request.id,
      p_reply: reply,
    });
    if (error) throw new Error(`Could not send the answer: ${error.message}`);
  }
  redirect("/account/pending");
}
