"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { FormState } from "@/components/profile/ProfileForm";
import { homeFor } from "@/lib/auth/home";
import type { Json } from "@/lib/database";
import {
  POLICY_VERSION,
  STEPS,
  parseAbout,
  parseCareer,
  parseChannels,
  parseEducation,
  parseOffers,
  parsePublish,
  readForm,
  type Parsed,
  type Step,
} from "@/lib/profile/fields";
import { loadMyProfile, type MyProfile } from "@/lib/profile/server";

// The onboarding wizard's saves (ONB-05). Each step is one save_my_profile call, a single transaction checked
// again in the database, so a failed step never loses what an earlier step saved.

const failure = (error: { code?: string }): FormState => ({
  errors: {},
  failed: error.code === "42501" ? "forbidden" : "failed",
});

type Sections = { profile?: Record<string, Json>; [section: string]: Json | undefined };

function parseStep(
  step: Exclude<Step, "publish">,
  form: FormData,
  me: MyProfile,
): Parsed<Sections> {
  const reader = readForm(form);
  switch (step) {
    case "welcome":
      return { ok: true, data: {} };
    case "about":
      return parseAbout(reader);
    case "education":
      return parseEducation(reader);
    case "career":
      return parseCareer(
        reader,
        me.careerFields.map((field) => field.id),
      );
    case "networking":
      return {
        ok: true,
        data: parseOffers(
          reader,
          me.offerTypes.map((offer) => offer.key),
        ),
      };
    case "contact":
      return parseChannels(reader);
  }
}

/** Saves one step, then moves on to the next. */
export async function saveStep(
  step: Exclude<Step, "publish">,
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const me = await loadMyProfile(`/onboarding/${step}`);
  if (me.profile.onboarding_completed_at) redirect(homeFor(me.state));
  const parsed = parseStep(step, form, me);
  if (!parsed.ok) return { errors: parsed.errors };

  if (step === "welcome") {
    const locale = form.get("locale") === "fr" ? "fr" : "en";
    (await cookies()).set("herzliah-language", locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    // Emails follow the person's saved language.
    const { error } = await me.supabase.rpc("set_my_locale", { p_locale: locale });
    if (error) return failure(error);
  }

  const index = STEPS.indexOf(step);
  const payload: Sections = {
    ...parsed.data,
    profile: {
      ...parsed.data.profile,
      onboarding_step: Math.max(me.profile.onboarding_step, index + 1),
    },
  };
  const { error } = await me.supabase.rpc("save_my_profile", {
    p_inst: me.school.id,
    p_payload: payload,
  });
  if (error) return failure(error);
  redirect(`/onboarding/${STEPS[index + 1]}`);
}

/**
 * The last step: records the consents, marks onboarding complete, then publishes or keeps the profile hidden
 * (PRF-05). The order matters: set_my_visibility only publishes a completed profile with its consent on file.
 */
export async function finish(_: FormState, form: FormData): Promise<FormState> {
  const me = await loadMyProfile("/onboarding/publish");
  if (me.profile.onboarding_completed_at) redirect(homeFor(me.state));
  const parsed = parsePublish(readForm(form));
  if (!parsed.ok) return { errors: parsed.errors };
  const { visibility } = parsed.data;

  const documents = [
    "terms",
    "privacy_policy",
    ...(visibility === "members" ? (["directory_publication"] as const) : []),
  ] as const;
  for (const document of documents) {
    if (me.consents.some((c) => c.document === document && c.version === POLICY_VERSION)) continue;
    const { error } = await me.supabase.rpc("record_consent", {
      p_inst: me.school.id,
      p_document: document,
      p_version: POLICY_VERSION,
    });
    if (error) return failure(error);
  }

  const completed = await me.supabase.rpc("save_my_profile", {
    p_inst: me.school.id,
    p_payload: { profile: { onboarding_step: STEPS.length, onboarding_completed: true } },
  });
  if (completed.error) return failure(completed.error);

  if (visibility !== me.profile.visibility) {
    const { error } = await me.supabase.rpc("set_my_visibility", {
      p_inst: me.school.id,
      p_visibility: visibility,
    });
    if (error) return failure(error);
  }
  revalidatePath("/", "layout");
  // TODO(PRF-02): land on /me, as the design does, once the profile editor is on the v2 schema.
  redirect("/directory");
}
