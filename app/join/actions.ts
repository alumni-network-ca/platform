"use server";

import { redirect } from "next/navigation";
import { requireAccess } from "@/lib/auth/account";

export type JoinResult = { error: "missing" | "tooMany" | "failed" | null };

/** Sends the sign-up to the school's approval queue (ADR 0004). Consent capture and Turnstile come in ONB-03. */
export async function requestAccess(_: JoinResult, form: FormData): Promise<JoinResult> {
  const { school, supabase } = await requireAccess("/join");
  const field = (name: string) => String(form.get(name) ?? "").trim();
  const gradYear = Number(field("grad_year"));
  if (!field("first_name") || !field("last_name") || !Number.isInteger(gradYear))
    return { error: "missing" };

  const { error } = await supabase.rpc("request_access", {
    p_inst: school.id,
    p_first_name: field("first_name"),
    p_last_name: field("last_name"),
    p_maiden_name: field("maiden_name"),
    p_grad_year: gradYear,
    p_note: field("note"),
  });
  if (error) return { error: error.code === "54000" ? "tooMany" : "failed" };
  redirect("/account/pending");
}
