"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/components/profile/ProfileForm";
import { POLICY_VERSION, readForm, signedInRecently, type Section } from "@/lib/profile/fields";
import { failure, loadMyProfile, parseSection } from "@/lib/profile/server";

// The alumnus's own profile (PRF-02, PRF-05, PRF-06). Every change goes through an RPC that checks the caller
// again in the database; these actions only shape the input and choose the page that follows.

async function completedProfile(path: string) {
  const me = await loadMyProfile(path);
  if (!me.profile.onboarding_completed_at) redirect("/onboarding");
  return me;
}

/** Saves one section of the profile; the directory shows the change at once. */
export async function saveSection(
  section: Exclude<Section, "welcome">,
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const me = await completedProfile(`/me/edit/${section}`);
  const parsed = parseSection(section, form, me);
  if (!parsed.ok) return { errors: parsed.errors };
  const { error } = await me.supabase.rpc("save_my_profile", {
    p_inst: me.school.id,
    p_payload: parsed.data,
  });
  if (error) return failure(error);
  revalidatePath("/", "layout");
  redirect("/me?saved=1");
}

/**
 * Publishes or hides the profile (PRF-05). Publishing needs a directory consent on file: the first time, the
 * form asks for it and it is recorded with the policy version before set_my_visibility checks it.
 */
export async function saveVisibility(_: FormState, form: FormData): Promise<FormState> {
  const me = await completedProfile("/me/visibility");
  const reader = readForm(form);
  const visibility = reader.get("visibility") === "members" ? "members" : "hidden";
  const consented = (document: string) => me.consents.some((c) => c.document === document);

  if (visibility === "members" && !consented("directory_publication")) {
    if (reader.get("consent") !== "on") return { errors: { consent: { code: "consent" } } };
    for (const document of ["terms", "privacy_policy", "directory_publication"] as const) {
      if (me.consents.some((c) => c.document === document && c.version === POLICY_VERSION))
        continue;
      const { error } = await me.supabase.rpc("record_consent", {
        p_inst: me.school.id,
        p_document: document,
        p_version: POLICY_VERSION,
      });
      if (error) return failure(error);
    }
  }
  if (visibility !== me.profile.visibility) {
    const { error } = await me.supabase.rpc("set_my_visibility", {
      p_inst: me.school.id,
      p_visibility: visibility,
    });
    if (error) return failure(error);
  }
  revalidatePath("/", "layout");
  redirect("/me?saved=1");
}

/** "It's still accurate": the yearly confirmation without changing anything (DEC-06). */
export async function confirmStillAccurate(): Promise<void> {
  const me = await completedProfile("/me");
  const { error } = await me.supabase.rpc("confirm_still_accurate_in_app", {
    p_inst: me.school.id,
  });
  if (error) throw new Error(`Could not confirm the profile: ${error.message}`);
  revalidatePath("/me");
  redirect("/me?confirmed=1");
}

/**
 * Deletes this school's profile and ends the membership (PRF-06). It needs a recent sign-in, checked here as
 * well as on the page, then signs this address out.
 */
export async function deleteMyProfile(_: FormState, form: FormData): Promise<FormState> {
  const me = await loadMyProfile("/me/delete");
  if (form.get("confirm") !== "on") return { errors: { confirm: { code: "confirm" } } };
  if (!signedInRecently(me.user.last_sign_in_at, new Date()))
    return { errors: {}, failed: "reauth" };
  const { error } = await me.supabase.rpc("delete_my_profile", { p_inst: me.school.id });
  if (error) return failure(error);
  await me.supabase.auth.signOut({ scope: "local" });
  revalidatePath("/", "layout");
  // Let the browser reload the school address with the updated session cookies.
  return { errors: {}, next: "/" };
}
