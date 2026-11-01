import "server-only";
import { getOrigin, getSchool } from "@/lib/tenant/server";
import { rootUrl, schoolUrl } from "@/lib/tenant/address";
import { signupDestination } from "./next";

/** Preserve the current school's address, including its selector on shared Vercel previews. */
export async function authEmailRedirect(kind: "signup" | "recovery", next?: string) {
  const [origin, school] = await Promise.all([getOrigin(), getSchool()]);
  const destination = signupDestination(next);
  const path = `/auth/confirm?flow=${kind}${kind === "signup" && destination !== "/join" ? `&next=${encodeURIComponent(destination)}` : ""}`;
  return school ? schoolUrl(origin, school.slug, path) : rootUrl(origin, path);
}
