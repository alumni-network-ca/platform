"use server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/staff";
import type { Enums } from "@/lib/database";
import { templateKeys, templatePlaceholders } from "@/lib/admin/templates";
import { actionError, field, type ActionResult } from "@/lib/admin/forms";
export async function approveTemplate(
  key: Enums<"email_template_key">,
  locale: "en" | "fr",
  _: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const { supabase, school } = await requireStaff("/admin/templates", "templates.manage");
  if (!templateKeys.includes(key) || (locale !== "en" && locale !== "fr"))
    return { error: "invalid" };
  const subject = field(form, "subject"),
    body = String(form.get("body") ?? "");
  const placeholders = [...(subject + " " + body).matchAll(/\{([^}]*)\}/g)].map(
    (match) => match[1],
  );
  if (
    !subject ||
    !body.trim() ||
    subject.length > 200 ||
    body.length > 20000 ||
    placeholders.some((p) => !templatePlaceholders[key].includes(p!))
  )
    return { error: "invalid" };
  const { error } = await supabase.rpc("approve_email_template_version", {
    p_inst: school.id,
    p_key: key,
    p_locale: locale,
    p_subject: subject,
    p_body: body,
  });
  if (error) return actionError(error);
  revalidatePath("/admin", "layout");
  return { error: null, saved: true };
}
