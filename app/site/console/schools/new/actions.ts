"use server";

import { redirect } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/auth/platform";
import { isSlug } from "@/lib/tenant/host";

export type CreateSchoolResult = { error: string | null };

/** S1.2: creates the school (platform_create_school checks the caller, the address and the branding again). */
export async function createSchool(
  _: CreateSchoolResult,
  form: FormData,
): Promise<CreateSchoolResult> {
  const { supabase } = await requirePlatformAdmin("/console/schools/new");
  const field = (name: string) => String(form.get(name) ?? "").trim();
  const slug = field("slug").toLowerCase();
  if (field("name").length < 2) return { error: "Give the school its full name." };
  if (!isSlug(slug))
    return { error: "The address needs 2 to 40 lowercase letters, digits or hyphens." };

  const { error } = await supabase.rpc("platform_create_school", {
    p_name: field("name"),
    p_slug: slug,
    p_default_locale: field("locale") === "fr" ? "fr" : "en",
    p_reply_to: field("reply_to") || undefined,
    p_email_display_name: field("sender_name") || undefined,
    p_branding: {
      short_name: field("short_name"),
      logo: field("logo"),
      primary_color: field("primary_color"),
      accent_color: field("accent_color"),
    },
  });
  if (error) {
    if (error.code === "23505")
      return { error: `${slug} is already taken. Choose another address.` };
    if (error.code === "23514") return { error: "Check the reply-to address and the name." };
    if (error.code === "22023")
      return { error: `${error.message[0]?.toUpperCase()}${error.message.slice(1)}.` };
    return { error: "Could not create the school. Please try again." };
  }
  redirect(`/console/schools/${slug}`);
}
