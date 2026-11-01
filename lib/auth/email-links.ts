import "server-only";
import { getOrigin, getSchool } from "@/lib/tenant/server";
import { rootUrl, schoolUrl } from "@/lib/tenant/address";

/** Preserve the current school's address, including its selector on shared Vercel previews. */
export async function authEmailRedirect(kind: "signup" | "recovery") {
  const [origin, school] = await Promise.all([getOrigin(), getSchool()]);
  const path = `/auth/confirm?flow=${kind}`;
  return school ? schoolUrl(origin, school.slug, path) : rootUrl(origin, path);
}
