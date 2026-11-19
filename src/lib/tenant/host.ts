// Which school a request is for, from its host (ADR 0001). Pure, so it is unit-tested without a server.
//
//   herzliah.alumninetwork.ca            → school "herzliah"   (ROOT_DOMAIN=alumninetwork.ca)
//   herzliah.staging.alumninetwork.ca    → school "herzliah"   (ROOT_DOMAIN=staging.alumninetwork.ca)
//   herzliah.localhost:3000              → school "herzliah"   (ROOT_DOMAIN=localhost, the default)
//   alumninetwork.ca, www.alumninetwork.ca, localhost:3000 → the root site (for schools, console)
//   <anything>.vercel.app on a PR preview → the `tenant` cookie ("root": the root site), else the preview default school
//   anything else                         → no tenant (404)
import { ADMIN_LABEL, PREVIEW_ROOT } from "@/config/tenancy";

// Same rule as the institutions.slug check constraint.
const SLUG = /^[a-z0-9-]{2,40}$/;

export type Tenant =
  { kind: "school"; slug: string } | { kind: "admin" } | { kind: "root" } | { kind: "none" };

export type TenantInput = {
  host: string | null;
  rootDomain: string;
  /** True only when VERCEL_ENV is "preview". */
  isPreview: boolean;
  previewCookie?: string;
  previewDefault?: string;
};

export function isSlug(value: string | undefined): value is string {
  return value !== undefined && SLUG.test(value);
}

export function resolveTenant({
  host,
  rootDomain,
  isPreview,
  previewCookie,
  previewDefault,
}: TenantInput): Tenant {
  const hostname = (host ?? "").toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
  const root = rootDomain.toLowerCase();
  if (hostname === root || hostname === `www.${root}`) return { kind: "root" };
  if (hostname.endsWith(`.${root}`)) {
    const label = hostname.slice(0, -(root.length + 1));
    if (label === ADMIN_LABEL) return { kind: "admin" };
    return isSlug(label) ? { kind: "school", slug: label } : { kind: "none" };
  }
  if (isPreview) {
    if (previewCookie === PREVIEW_ROOT) return { kind: "root" };
    if (previewCookie === ADMIN_LABEL) return { kind: "admin" };
    const slug = isSlug(previewCookie) ? previewCookie : previewDefault;
    return isSlug(slug) ? { kind: "school", slug } : { kind: "root" };
  }
  return { kind: "none" };
}
