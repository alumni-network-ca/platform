"use server";

import { requireAccess } from "@/lib/auth/account";

export type JoinResult = { error: "missing" | "tooMany" | "failed" | null; next?: string };

/** Sends the sign-up to the school's approval queue (ADR 0004). Consent capture and Turnstile come in ONB-03. */
export async function requestAccess(_: JoinResult, form: FormData): Promise<JoinResult> {
  return submitRequest("/join", form);
}

export async function updateRequest(_: JoinResult, form: FormData): Promise<JoinResult> {
  return submitRequest("/join/edit", form);
}

async function submitRequest(path: string, form: FormData): Promise<JoinResult> {
  const { school, supabase } = await requireAccess(path);
  const field = (name: string) => String(form.get(name) ?? "").trim();
  const gradYear = Number(field("grad_year"));
  if (
    !field("first_name") ||
    !field("last_name") ||
    !Number.isInteger(gradYear) ||
    gradYear < 1900 ||
    gradYear > new Date().getFullYear() + 1 ||
    ["first_name", "last_name", "maiden_name"].some((name) => field(name).length > 80) ||
    field("note").length > 1000 ||
    field("school_student_id").length > 40
  )
    return { error: "missing" };

  const { error } = await supabase.rpc("request_access", {
    p_inst: school.id,
    p_first_name: field("first_name"),
    p_last_name: field("last_name"),
    p_maiden_name: field("maiden_name"),
    p_grad_year: gradYear,
    p_note: field("note"),
    p_school_student_id: field("school_student_id"),
  });
  if (error) return { error: error.code === "54000" ? "tooMany" : "failed" };
  return { error: null, next: "/account/pending" };
}
