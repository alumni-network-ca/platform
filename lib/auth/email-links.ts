import "server-only";
import { PREVIEW_COOKIE, PREVIEW_ROOT } from "@/config/tenancy";
import { usesTenantSelector } from "@/lib/tenant/address";
import { getOrigin, getSchool } from "@/lib/tenant/server";
import { signupDestination } from "./next";

/** Preserve the current school's address, including its selector on shared Vercel previews. */
export async function authEmailRedirect(kind: "signup" | "recovery", next?: string) {
  const [origin, school] = await Promise.all([getOrigin(), getSchool()]);
  const destination = signupDestination(next);
  const path = `/auth/confirm?flow=${kind}${kind === "signup" && destination !== "/join" ? `&next=${encodeURIComponent(destination)}` : ""}`;
  // Auth must return to the host that owns the session cookies, including temporary custom domains.
  const url = new URL(path, `${origin.protocol}//${origin.host}`);
  if (usesTenantSelector(origin))
    url.searchParams.set(PREVIEW_COOKIE, school?.slug ?? PREVIEW_ROOT);
  return url.toString();
}
