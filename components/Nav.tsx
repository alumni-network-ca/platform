import "server-only";
import type { User } from "@supabase/supabase-js";
import { getAccount } from "@/lib/auth/account";
import { isActiveMember, isStaff } from "@/lib/auth/home";
import { navModel, type NavInput } from "@/lib/auth/nav";
import { getPlatformAdmin } from "@/lib/auth/platform";
import { translations } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n-server";
import { schoolBranding } from "@/lib/school";
import { createClient } from "@/lib/supabase/server";
import { getOrigin, getSchool } from "@/lib/tenant/server";
import { NavBar } from "./NavBar";

type Supabase = Awaited<ReturnType<typeof createClient>>;
type Reads = Omit<NavInput, "t" | "locale" | "origin">;

/**
 * The top bar of every page (docs/design/nav-bar.md). Who the person is here is read on the server, through
 * RLS, and passed to the client as a finished model: the browser never queries roles.
 */
export async function Nav() {
  const [school, locale, origin] = await Promise.all([getSchool(), getServerLocale(), getOrigin()]);
  const reads = school ? await readSchool() : await readRoot();
  return <NavBar model={navModel({ ...reads, t: translations[locale].nav, locale, origin })} />;
}

async function read<T>(query: PromiseLike<{ data: T; error: { message: string } | null }>) {
  const { data, error } = await query;
  if (error) throw new Error(`Could not load the nav bar: ${error.message}`);
  return data;
}

async function count(
  query: PromiseLike<{ count: number | null; error: { message: string } | null }>,
) {
  const { count, error } = await query;
  if (error) throw new Error(`Could not load the nav bar: ${error.message}`);
  return count ?? 0;
}

const person = (user: User, name: string | null) => ({
  name,
  email: user.email ?? "",
  twoFactor: user.factors?.some((factor) => factor.status === "verified") ?? false,
});

async function readSchool(): Promise<Reads> {
  const now = new Date();
  const { school, supabase, user, state } = await getAccount();
  const { shortName, logo } = schoolBranding(school);
  const site = { name: school.name, slug: school.slug, shortName, logo, replyTo: null };
  if (!user || !state) return { now, school: site, user: null, state: null };

  const staff = isStaff(state);
  const [profile, request, institution, permissions, pendingRequests, grant] = await Promise.all([
    state.profile &&
      read(
        supabase
          .from("alumni_profiles")
          .select("first_name, last_name, preferred_name, grad_year, visibility")
          .eq("institution_id", school.id)
          .eq("user_id", user.id)
          .maybeSingle(),
      ),
    !state.profile &&
      state.request &&
      read(
        supabase
          .from("access_requests")
          .select("first_name, last_name")
          .eq("institution_id", school.id)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ),
    // Members (and platform admins) may read the school's row, with its reply-to address; applicants may not.
    (isActiveMember(state) || state.platformAdmin) &&
      read(
        supabase.from("institutions").select("reply_to_email").eq("id", school.id).maybeSingle(),
      ),
    staff &&
      read(
        supabase.from("role_permissions").select("permission").eq("role", state.membership!.role),
      ),
    staff &&
      count(
        supabase
          .from("access_requests")
          .select("id", { count: "exact", head: true })
          .eq("institution_id", school.id)
          .eq("status", "pending"),
      ),
    state.platformAdmin &&
      read(
        supabase
          .from("platform_access_grants")
          .select("id")
          .eq("institution_id", school.id)
          .eq("user_id", user.id)
          .is("revoked_at", null)
          .gt("expires_at", now.toISOString())
          .limit(1)
          .maybeSingle(),
      ),
  ]);

  const named = profile || request;
  const name = named
    ? `${(profile && profile.preferred_name) || named.first_name} ${named.last_name}`.trim()
    : null;
  return {
    now,
    school: { ...site, replyTo: (institution && institution.reply_to_email) || null },
    user: person(user, name),
    state,
    profile: profile ? { gradYear: profile.grad_year, visibility: profile.visibility } : null,
    permissions: permissions ? permissions.map((row) => row.permission) : [],
    pendingRequests: pendingRequests || 0,
    platform: grant ? await readPlatform(supabase, user.id, now, true) : null,
  };
}

async function readRoot(): Promise<Reads> {
  const now = new Date();
  const admin = await getPlatformAdmin();
  if (admin) {
    return {
      now,
      school: null,
      state: null,
      user: person(admin.user, null),
      platform: await readPlatform(admin.supabase, admin.user.id, now, false),
    };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { now, school: null, state: null, user: user && person(user, null) };
}

/** Counts per school only (ADR 0005), plus the platform admin's own open grants. */
async function readPlatform(supabase: Supabase, userId: string, now: Date, grantHere: boolean) {
  const [summaries, grants] = await Promise.all([
    read(supabase.rpc("platform_school_summaries")),
    read(
      supabase
        .from("platform_access_grants")
        .select("institution_id, expires_at")
        .eq("user_id", userId)
        .is("revoked_at", null)
        .gt("expires_at", now.toISOString()),
    ),
  ]);
  const endsAt = new Map<string, string>();
  for (const grant of grants ?? []) {
    const known = endsAt.get(grant.institution_id);
    if (!known || grant.expires_at > known) endsAt.set(grant.institution_id, grant.expires_at);
  }
  return {
    grantHere,
    activeGrants: (summaries ?? []).reduce(
      (total, school) => total + Number(school.active_grants),
      0,
    ),
    // A suspended school's address answers 404, so only live schools can be opened.
    schools: (summaries ?? [])
      .filter((school) => school.status === "active")
      .map((school) => ({
        name: school.name,
        slug: school.slug,
        grantEndsAt: endsAt.get(school.id) ?? null,
      })),
  };
}
