"use server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/staff";
import { actionError, field, type ActionResult } from "@/lib/admin/forms";
export async function saveSettings(_: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase, school } = await requireStaff("/admin/settings", "settings.manage");
  const name = field(form, "sender"),
    replyTo = field(form, "reply_to"),
    locale = field(form, "locale");
  if (
    name.length > 120 ||
    replyTo.length > 254 ||
    (locale !== "en" && locale !== "fr") ||
    (replyTo && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(replyTo))
  )
    return { error: "invalid" };
  const { error } = await supabase.rpc("update_school_settings", {
    p_inst: school.id,
    p_patch: { email_display_name: name, reply_to_email: replyTo, default_locale: locale },
  });
  if (error) return actionError(error);
  revalidatePath("/admin", "layout");
  return { error: null, saved: true };
}
