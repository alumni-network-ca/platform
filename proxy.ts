// Runs before every page request (Next.js 16 proxy, Node.js runtime):
// 1. Resolves the school from the host (FND-07, ADR 0001). The school travels to server components in the
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
import { isSlug, resolveTenant } from "@/lib/tenant/host";
import { lookupSchool } from "@/lib/tenant/lookup";

/** Pages of the root domain (the page for schools, later the console) live under this path. */
const ROOT_SITE = "/site";

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
    // Unknown or suspended school, or a root-site path on a school address.
    if (!school || pathname === ROOT_SITE || pathname.startsWith(`${ROOT_SITE}/`))
      return notFound();
  }

  // Built again whenever the session cookies change, so server components see the refreshed session.
  const respond = () => {
    const headers = new Headers(request.headers);
    headers.delete(SCHOOL_HEADER);
    if (school) headers.set(SCHOOL_HEADER, encodeSchool(school));
    const response =
      tenant.kind === "root" && !pathname.startsWith("/api/")
        ? NextResponse.rewrite(
            new URL(`${ROOT_SITE}${pathname === "/" ? "" : pathname}${search}`, request.url),
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
