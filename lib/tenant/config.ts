import "server-only";
import { revalidateTag, unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import { cache } from "react";
import { serverEnv } from "@/config/env/server";
import type { SchoolConfig } from "@/lib/database";
import { anonClient } from "@/lib/supabase/anon";

// What every page of a school needs and almost nobody changes: branding, career fields, networking options and the
// role → permission table (school_config()). Read once per request, and cached across requests, visitors and servers.
// - A change made in the app shows on the next request: its action calls refreshSchoolConfig().
// - A deploy starts a fresh cache: the build's commit is part of the key.
// - A change made in SQL or by a migration run on its own shows within REFRESH_SECONDS.
const REFRESH_SECONDS = 300;

const tag = (schoolId: string) => `school-config:${schoolId}`;

async function fetchConfig(schoolId: string) {
  const { data, error } = await anonClient().rpc("school_config", { p_inst: schoolId });
  // Thrown, so a failed read is never cached.
  if (error) throw new Error(`Could not load the school's settings: ${error.message}`);
  return data;
}

/**
 * The config of an active school. A 404 when the school was suspended after proxy.ts looked it up: the proxy answers
 * 404 itself once its own cache expires.
 */
export const schoolConfig = cache(async (schoolId: string): Promise<SchoolConfig> => {
  const read = unstable_cache(fetchConfig, ["school-config", serverEnv.deploymentId], {
    tags: [tag(schoolId)],
    revalidate: REFRESH_SECONDS,
  });
  return (await read(schoolId)) ?? notFound();
});

/** After changing a school's branding, options or status: every server reads its config again on the next request. */
export function refreshSchoolConfig(schoolId: string) {
  revalidateTag(tag(schoolId), { expire: 0 });
}
