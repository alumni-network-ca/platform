// A new alumnus that Herzliah's school admin has just approved, for tests that change their own profile. Each call
// makes a fresh account, so no test edits a shared seed account. Local stack only (seed passwords, secret key).
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database";
import { adminClient } from "../../../../scripts/lib/supabase-admin.ts";
import { accounts, LOCAL_PASSWORD } from "./accounts";
import { newAddress } from "./mailpit";
import { stack } from "./session";

export const HERZLIAH = "aaaaaaaa-0000-4000-8000-000000000001";

/** A signed-in API client for a local account. */
export async function clientFor(email: string) {
  const client = createClient<Database>(stack.url, stack.publishableKey, {
    auth: { persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password: LOCAL_PASSWORD });
  if (error) throw new Error(`Could not sign in ${email}: ${error.message}`);
  return client;
}

/** Signs up, asks to join Herzliah and is approved, as a real applicant would be. Returns the email. */
export async function approvedAlumnus(firstName: string, lastName: string, gradYear = 2014) {
  const email = newAddress("alumnus");
  const created = await adminClient(stack).auth.admin.createUser({
    email,
    password: LOCAL_PASSWORD,
    email_confirm: true,
  });
  if (created.error) throw new Error(`Could not create ${email}: ${created.error.message}`);

  const applicant = await clientFor(email);
  const asked = await applicant.rpc("request_access", {
    p_inst: HERZLIAH,
    p_first_name: firstName,
    p_last_name: lastName,
    p_maiden_name: "",
    p_grad_year: gradYear,
    p_note: "",
  });
  if (asked.error) throw new Error(`request_access: ${asked.error.message}`);
  const request = await applicant
    .from("access_requests")
    .select("id")
    .eq("institution_id", HERZLIAH)
    .eq("user_id", created.data.user.id)
    .single();
  if (request.error) throw new Error(`access_requests: ${request.error.message}`);

  const school = await clientFor(accounts.admin);
  const decided = await school.rpc("decide_access_request", {
    p_request: request.data.id,
    p_decision: "approve",
  });
  if (decided.error) throw new Error(`decide_access_request: ${decided.error.message}`);
  return email;
}

/**
 * An approved alumnus who has finished onboarding through the API: a current role, a school, two channels
 * (email behind a button, LinkedIn shown) and one offer. The profile stays hidden.
 */
export async function onboardedAlumnus(firstName: string, lastName: string) {
  const email = await approvedAlumnus(firstName, lastName);
  const alumnus = await clientFor(email);
  const { error } = await alumnus.rpc("save_my_profile", {
    p_inst: HERZLIAH,
    p_payload: {
      profile: {
        job_title: "Product Designer",
        employer: "Northline Health",
        city: "Toronto",
        country: "Canada",
        bio: "Designs tools for clinics.",
        languages: ["en", "fr"],
        onboarding_step: 7,
        onboarding_completed: true,
      },
      education: [{ school: "McGill University", degree: "BA", graduation_year: 2018 }],
      experience: [
        { job_title: "Designer", employer: "Shopify", start_year: 2018, end_year: 2022 },
      ],
      channels: [
        { type: "email", value: email, is_public: true },
        {
          type: "linkedin",
          value: `https://www.linkedin.com/in/${lastName.toLowerCase()}`,
          is_public: true,
        },
      ],
      offers: ["mentoring"],
    },
  });
  if (error) throw new Error(`save_my_profile: ${error.message}`);
  return { email, client: alumnus };
}

/** Publishes an onboarded alumnus's profile, with the consents it needs. */
export async function publish(client: Awaited<ReturnType<typeof clientFor>>) {
  for (const document of ["terms", "privacy_policy", "directory_publication"] as const) {
    const { error } = await client.rpc("record_consent", {
      p_inst: HERZLIAH,
      p_document: document,
      p_version: "2026-10",
    });
    if (error) throw new Error(`record_consent: ${error.message}`);
  }
  const { error } = await client.rpc("set_my_visibility", {
    p_inst: HERZLIAH,
    p_visibility: "members",
  });
  if (error) throw new Error(`set_my_visibility: ${error.message}`);
}

/** How many directory results another alumnus gets for a name. */
export async function directoryHits(name: string) {
  const peer = await clientFor(accounts.alumni);
  const { data, error } = await peer.rpc("search_directory", {
    p_inst: HERZLIAH,
    p_filters: { q: name },
  });
  if (error) throw new Error(`search_directory: ${error.message}`);
  return data ?? [];
}
