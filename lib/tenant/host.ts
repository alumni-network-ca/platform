// Which school a request is for, from its host (ADR 0001). Pure, so it is unit-tested without a server.
//
//   herzliah.alumninetwork.ca            → school "herzliah"   (ROOT_DOMAIN=alumninetwork.ca)
//   herzliah.staging.alumninetwork.ca    → school "herzliah"   (ROOT_DOMAIN=staging.alumninetwork.ca)
//   herzliah.localhost:3000              → school "herzliah"   (ROOT_DOMAIN=localhost, the default)
//   alumninetwork.ca, www.alumninetwork.ca, localhost:3000 → the root site (for schools, console)
//   <anything>.vercel.app on a PR preview → the `tenant` cookie, else the preview default school
//   anything else                         → no tenant (404)

/** Request header the proxy sets to the resolved school. Any client-sent value is overwritten. */
export const SCHOOL_HEADER = "x-school";
/** Cookie that picks the school on Vercel PR previews, which have no school subdomain. Ignored elsewhere. */
export const PREVIEW_COOKIE = "tenant";

// Same rule as the institutions.slug check constraint.
const SLUG = /^[a-z0-9-]{2,40}$/;

export type Tenant = { kind: "school"; slug: string } | { kind: "root" } | { kind: "none" };

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
    return isSlug(label) ? { kind: "school", slug: label } : { kind: "none" };
  }
  if (isPreview) {
    const slug = isSlug(previewCookie) ? previewCookie : previewDefault;
    return isSlug(slug) ? { kind: "school", slug } : { kind: "root" };
  }
  return { kind: "none" };
}
