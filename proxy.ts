// Runs before every page request (Next.js 16 proxy, Node.js runtime):
// 1. Resolves the site from the host (FND-07, ADR 0001): the landing page on the root domain, the platform console
//    on admin.<root>, or a school on <slug>.<root>. The school travels to server components in the
//    x-school request header; a client-sent x-school is always replaced or removed. Its branding does not: pages
//    read that from the cached school config (lib/tenant/config.ts).
// 2. Refreshes the Supabase session and writes the new cookies to the response (FND-08). Cookies have no
//    Domain attribute, so a session belongs to one school's address only (ADR 0002).
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/config/env/public";
import { serverEnv } from "@/config/env/server";
import { PREVIEW_COOKIE, SCHOOL_HEADER } from "@/config/tenancy";
import type { Database } from "@/lib/database";
import { encodeSchool, type PublicSchool } from "@/lib/school";
import { anonClient } from "@/lib/supabase/anon";
import { adminUrl } from "@/lib/tenant/address";
import { isSlug, resolveTenant, type Tenant } from "@/lib/tenant/host";
import { lookupSchool } from "@/lib/tenant/lookup";

/** Pages of the root domain (the landing page) live under this path. */
const ROOT_SITE = "/site";
/** Pages of the platform console (admin.<root>) live under this path. */
const ADMIN_SITE = "/console";
/** The console's addresses before it moved to admin.<root>: the root domain sends them there. */
const MOVED_TO_ADMIN = ["/login", "/forgot-password", "/reset-password", "/auth/confirm"];

const under = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

/** The internal folder a site's pages live in, so the proxy can rewrite to it and block it elsewhere. */
const siteFolder = (tenant: Tenant) =>
  tenant.kind === "root" ? ROOT_SITE : tenant.kind === "admin" ? ADMIN_SITE : null;

async function fetchSchool(slug: string) {
  const { data, error } = await anonClient().rpc("public_school", { p_slug: slug });
  if (error) throw new Error(`public_school: ${error.message}`);
  return data;
}

const notFound = () => new NextResponse("Not found", { status: 404 });

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const { isPreview } = serverEnv;
  // On PR previews, ?tenant=<slug> switches school and is remembered in a cookie.
  const switchTo = isPreview
    ? (request.nextUrl.searchParams.get(PREVIEW_COOKIE) ?? undefined)
    : undefined;
  const tenant = resolveTenant({
    host: request.headers.get("host"),
    rootDomain: serverEnv.rootDomain,
    isPreview,
    previewCookie: switchTo ?? request.cookies.get(PREVIEW_COOKIE)?.value,
    previewDefault: serverEnv.previewDefaultSchool,
  });
  if (tenant.kind === "none") return notFound();

  // The console used to live on the root domain: send old links and bookmarks to admin.<root>.
  if (
    tenant.kind === "root" &&
    (under(pathname, ADMIN_SITE) || MOVED_TO_ADMIN.some((p) => under(pathname, p)))
  ) {
    const path = under(pathname, ADMIN_SITE) ? pathname.slice(ADMIN_SITE.length) || "/" : pathname;
    const origin = {
      protocol: request.nextUrl.protocol === "http:" ? ("http:" as const) : ("https:" as const),
      host: request.headers.get("host") ?? "",
      rootDomain: serverEnv.rootDomain,
      isPreview,
    };
    // On a preview, adminUrl adds ?tenant=admin in place of the ?tenant= that brought us here.
    const query = new URLSearchParams(search);
    query.delete(PREVIEW_COOKIE);
    const rest = query.size ? `?${query}` : "";
    return NextResponse.redirect(adminUrl(origin, `${path}${rest}`), 308);
  }

  // Another site's internal folder: /site off the root domain, /console off the console's address.
  const folder = siteFolder(tenant);
  if ([ROOT_SITE, ADMIN_SITE].some((prefix) => prefix !== folder && under(pathname, prefix)))
    return notFound();

  let school: PublicSchool | null = null;
  if (tenant.kind === "school") {
    try {
      school = await lookupSchool(tenant.slug, fetchSchool);
    } catch {
      return new NextResponse("Temporarily unavailable", {
        status: 503,
        headers: { "retry-after": "30" },
      });
    }
    // Unknown or suspended school.
    if (!school) return notFound();
  }

  // Built again whenever the session cookies change, so server components see the refreshed session.
  const respond = () => {
    const headers = new Headers(request.headers);
    headers.delete(SCHOOL_HEADER);
    if (school) headers.set(SCHOOL_HEADER, encodeSchool(school));
    const response =
      folder && !pathname.startsWith("/api/")
        ? NextResponse.rewrite(
            new URL(`${folder}${pathname === "/" ? "" : pathname}${search}`, request.url),
            {
              request: { headers },
            },
          )
        : NextResponse.next({ request: { headers } });
    if (isSlug(switchTo))
      response.cookies.set(PREVIEW_COOKIE, switchTo, { path: "/", sameSite: "lax" });
    return response;
  };

  let response = respond();
  const { supabaseUrl, supabasePublishableKey } = publicEnv;
  const supabase = createServerClient<Database>(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = respond();
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        // No-cache headers, so a CDN never serves one person's refreshed session to someone else.
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });
  // Refreshes an expired access token. Must run before the response is returned.
  await supabase.auth.getClaims();
  return response;
}

export const config = {
  // Everything except build assets and public files.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|txt|xml)$).*)",
  ],
};
