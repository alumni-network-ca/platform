// Links between the root site (the console) and the schools' addresses, on the deployment that served the
// request. Pure, so it is unit-tested; lib/tenant/server.ts reads the request's origin.
import { PREVIEW_COOKIE, PREVIEW_ROOT } from "./host";

export type Origin = {
  protocol: "http:" | "https:";
  /** The request's Host header, port included. */
  host: string;
  rootDomain: string;
  /** True only when VERCEL_ENV is "preview": one host for everything, the school picked by ?tenant=. */
  isPreview: boolean;
};

const port = (host: string) => host.match(/:\d+$/)?.[0] ?? "";
const withTenant = (path: string, tenant: string) =>
  `${path}${path.includes("?") ? "&" : "?"}${PREVIEW_COOKIE}=${tenant}`;

/** A school's address: https://herzliah.alumninetwork.ca/path, or ?tenant=herzliah on a preview. */
export function schoolUrl(origin: Origin, slug: string, path = "/"): string {
  if (origin.isPreview) return `${origin.protocol}//${origin.host}${withTenant(path, slug)}`;
  return `${origin.protocol}//${slug}.${origin.rootDomain}${port(origin.host)}${path}`;
}

/** The root site: https://alumninetwork.ca/path, or ?tenant=root on a preview. */
export function rootUrl(origin: Origin, path = "/"): string {
  if (origin.isPreview)
    return `${origin.protocol}//${origin.host}${withTenant(path, PREVIEW_ROOT)}`;
  return `${origin.protocol}//${origin.rootDomain}${port(origin.host)}${path}`;
}

/** A school's address label as typed in the console: "Maple Ridge Academy" → "maple-ridge". */
export function slugFromName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\b(high school|school|academy|college|collège|lycée|école)\b/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
}
