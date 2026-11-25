"use server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/staff";
import { actionError, field, type ActionResult } from "@/lib/admin/forms";
import { schoolPagePayload } from "@/lib/school-page";

export async function saveSchoolPage(_: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase, school } = await requireStaff("/admin/school-page", "settings.manage");
  const parsed = schoolPagePayload((name) => field(form, name));
  if ("error" in parsed) return parsed;
  const { error } = await supabase.rpc("set_school_page", {
    p_inst: school.id,
    p_page: parsed.payload as never,
  });
  if (error) return actionError(error);
  // The nav bar, in the root layout, shows the School link only when the page has content.
  revalidatePath("/", "layout");
  return { error: null, saved: true };
}
