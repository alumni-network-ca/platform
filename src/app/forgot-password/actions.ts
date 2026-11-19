"use server";
import { createClient } from "@/lib/supabase/server";
import { authEmailRedirect } from "@/lib/auth/email-links";

export type RecoveryResult = { sent: boolean; error: "email" | "tooMany" | "failed" | null };
export async function sendPasswordReset(
  _: RecoveryResult,
  form: FormData,
): Promise<RecoveryResult> {
  const email = String(form.get("email") ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
    return { sent: false, error: "email" };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: await authEmailRedirect("recovery"),
  });
  if (error) return { sent: false, error: error.status === 429 ? "tooMany" : "failed" };
  // The same response for known and unknown addresses.
  return { sent: true, error: null };
}
