// Runs before every page request (Next.js 16 proxy, Node.js runtime):
// 1. Resolves the school from the host (FND-07, ADR 0001). The school travels to server components in the
//    x-school request header; a client-sent x-school is always replaced or removed.
// 2. Refreshes the Supabase session and writes the new cookies to the response (FND-08). Cookies have no
//    Domain attribute, so a session belongs to one school's address only (ADR 0002).
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database";
import { encodeSchool, type PublicSchool } from "@/lib/school";
import { PREVIEW_COOKIE, SCHOOL_HEADER, isSlug, resolveTenant } from "@/lib/tenant/host";
import { lookupSchool } from "@/lib/tenant/lookup";

/** Pages of the root domain (the page for schools, later the console) live under this path. */
const ROOT_SITE = "/site";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
// Signed-out client for the public school card. It never carries a user's session. Created on first use, so a
// missing Supabase variable surfaces as a failed request rather than a crash while the module loads.
let anon: SupabaseClient<Database> | undefined;

async function fetchSchool(slug: string) {
  anon ??= createClient<Database>(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await anon.rpc("public_school", { p_slug: slug });
  if (error) throw new Error(`public_school: ${error.message}`);
  return data;
}

const notFound = () => new NextResponse("Not found", { status: 404 });

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isPreview = process.env.VERCEL_ENV === "preview";
  // On PR previews, ?tenant=<slug> switches school and is remembered in a cookie.
  const switchTo = isPreview
    ? (request.nextUrl.searchParams.get(PREVIEW_COOKIE) ?? undefined)
    : undefined;
  const tenant = resolveTenant({
    host: request.headers.get("host"),
    rootDomain: process.env.ROOT_DOMAIN ?? "localhost",
    isPreview,
    previewCookie: switchTo ?? request.cookies.get(PREVIEW_COOKIE)?.value,
    previewDefault: process.env.PREVIEW_DEFAULT_SCHOOL ?? "herzliah",
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
  const supabase = createServerClient<Database>(supabaseUrl, publishableKey, {
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
