import "server-only";
import { requireAccess } from "@/lib/auth/account";
import { translations } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n-server";
import { schoolBranding } from "@/lib/school";
import { schoolConfig } from "@/lib/tenant/config";
import type { FormState } from "@/components/profile/ProfileForm";
import type { Json } from "@/lib/database";
import {
  optionsFor,
  parseAbout,
  parseCareer,
  parseChannels,
  parseEducation,
  parseOffers,
  readForm,
  type Channel,
  type Parsed,
  type Section,
} from "./fields";

async function read<T>(query: PromiseLike<{ data: T; error: { message: string } | null }>) {
  const { data, error } = await query;
  if (error) throw new Error(`Could not load the profile: ${error.message}`);
  return data;
}

/**
 * The signed-in alumnus's own profile at this school, with every section and the school's options, read
 * through RLS. The page guard comes first, so only someone with an active profile here gets this far.
 */
export async function loadMyProfile(path: string) {
  const { school, supabase, user, state } = await requireAccess(path);
  const [locale, { career_fields: careerFields, offer_types: offerTypes }, profile] =
    await Promise.all([
      getServerLocale(),
      schoolConfig(school.id),
      read(
        supabase
          .from("alumni_profiles")
          .select(
            "id, first_name, last_name, preferred_name, grad_year, city, country, bio, job_title, employer, career_field_id, languages, visibility, onboarding_step, onboarding_completed_at, last_confirmed_at, confirmation_due_at",
          )
          .eq("institution_id", school.id)
          .eq("user_id", user.id)
          .eq("status", "active")
          .single(),
      ),
    ]);
  // single() already errors without a row; this narrows the type.
  if (!profile) throw new Error("Could not load the profile: no active profile");
  const [privateRow, education, experience, channels, offers, consents] = await Promise.all([
    read(
      supabase
        .from("alumni_private")
        .select("maiden_name")
        .eq("profile_id", profile.id)
        .maybeSingle(),
    ),
    read(
      supabase
        .from("alumni_education")
        .select("school, degree, field_of_study, graduation_year")
        .eq("profile_id", profile.id)
        .order("sort_order"),
    ),
    read(
      supabase
        .from("alumni_experience")
        .select(
          "job_title, employer, location, start_year, start_month, end_year, end_month, is_current",
        )
        .eq("profile_id", profile.id)
        .order("sort_order"),
    ),
    read(
      supabase
        .from("profile_contact_channels")
        .select("type, value, is_public")
        .eq("profile_id", profile.id)
        .order("sort_order"),
    ),
    read(supabase.from("profile_offers").select("offer_type_id").eq("profile_id", profile.id)),
    read(
      supabase
        .from("consents")
        .select("document, version")
        .eq("institution_id", school.id)
        .eq("user_id", user.id)
        .is("withdrawn_at", null),
    ),
  ]);

  const keyOf = new Map(offerTypes.map((o) => [o.id, o.key]));
  const label = (row: { label_en: string; label_fr: string }) =>
    locale === "fr" ? row.label_fr : row.label_en;
  return {
    school: { id: school.id, name: school.name, shortName: schoolBranding(school).shortName },
    supabase,
    user,
    state,
    locale,
    t: translations[locale].onboarding,
    profile,
    maidenName: privateRow?.maiden_name ?? "",
    education: education ?? [],
    experience: experience ?? [],
    channels: new Map((channels ?? []).map((c) => [c.type as Channel, c])),
    offers: (offers ?? []).flatMap((o) => keyOf.get(o.offer_type_id) ?? []),
    careerFields: optionsFor(careerFields, school.id).map((f) => ({
      id: f.id,
      label: label(f),
    })),
    offerTypes: optionsFor(offerTypes, school.id).map((o) => ({
      key: o.key,
      label: label(o),
    })),
    consents: consents ?? [],
  };
}

export type MyProfile = Awaited<ReturnType<typeof loadMyProfile>>;

/** What save_my_profile takes: the sections a form changed. */
export type Sections = { profile?: Record<string, Json>; [section: string]: Json | undefined };

/** One section's form, checked against the school's own career fields and options. */
export function parseSection(section: Section, form: FormData, me: MyProfile): Parsed<Sections> {
  const reader = readForm(form);
  switch (section) {
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

/** A database refusal (42501) or any other failure, as the form shows it. */
export const failure = (error: { code?: string }): FormState => ({
  errors: {},
  failed: error.code === "42501" ? "forbidden" : "failed",
});
