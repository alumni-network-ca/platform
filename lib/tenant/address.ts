// Links between the root site (the console) and the schools' addresses, on the deployment that served the
// request. Pure, so it is unit-tested; lib/tenant/server.ts reads the request's origin.
import { PREVIEW_COOKIE, PREVIEW_ROOT } from "@/config/tenancy";

export type Origin = {
  protocol: "http:" | "https:";
  /** The request's Host header, port included. */
  host: string;
  rootDomain: string;
  /** True when VERCEL_ENV is "preview": PR previews, but also staging, which has its own root domain. */
  isPreview: boolean;
};

/**
 * True when this host picks its school with ?tenant= (a PR preview on *.vercel.app). A preview deployment served
 * from the root domain or one of its schools (staging) uses subdomains like production, as proxy.ts resolves them.
 */
export function usesTenantSelector(origin: Origin): boolean {
  if (!origin.isPreview) return false;
  const hostname = origin.host.toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
  const root = origin.rootDomain.toLowerCase();
  return hostname !== root && !hostname.endsWith(`.${root}`);
}

const port = (host: string) => host.match(/:\d+$/)?.[0] ?? "";
const withTenant = (path: string, tenant: string) =>
  `${path}${path.includes("?") ? "&" : "?"}${PREVIEW_COOKIE}=${tenant}`;

/** A school's address: https://herzliah.alumninetwork.ca/path, or ?tenant=herzliah on a PR preview. */
export function schoolUrl(origin: Origin, slug: string, path = "/"): string {
  if (usesTenantSelector(origin))
    return `${origin.protocol}//${origin.host}${withTenant(path, slug)}`;
  return `${origin.protocol}//${slug}.${origin.rootDomain}${port(origin.host)}${path}`;
}

/** The root site: https://alumninetwork.ca/path, or ?tenant=root on a PR preview. */
export function rootUrl(origin: Origin, path = "/"): string {
  if (usesTenantSelector(origin))
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
