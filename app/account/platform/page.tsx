import Link from "next/link";
import { Nav } from "@/components/Nav";
import { SignOutButton } from "@/components/SignOutButton";
import { requireAccess } from "@/lib/auth/account";
import { schoolBranding } from "@/lib/school";
import { rootUrl } from "@/lib/tenant/address";
import { getOrigin } from "@/lib/tenant/server";

const time = (iso: string) =>
  new Date(iso).toLocaleString("en-CA", {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });

// Where a platform admin with no role at this school lands (homeFor). They see none of its data unless a
// support grant is open (ADR 0005), and they manage schools from the console on the root domain. English only:
// its readers are the platform admins.
export default async function PlatformAdminHere() {
  const { school, supabase, user } = await requireAccess("/account/platform");
  const now = new Date().toISOString();
  const { shortName } = schoolBranding(school);
  const { data: grant } = await supabase
    .from("platform_access_grants")
    .select("expires_at")
    .eq("institution_id", school.id)
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .gt("expires_at", now)
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const consoleUrl = rootUrl(await getOrigin(), `/console/support?school=${school.slug}`);

  return (
    <>
      <Nav />
      <main className="authPage">
        <section className="authCard">
          <h1>You are signed in as a platform admin</h1>
          <p className="muted">
            Platform admins don&apos;t see {shortName}&apos;s alumni data. To help the school, open
            support access from the console: it is read-only, ends on its own, and the school&apos;s
            admins see it in their audit log.
          </p>
          {grant ? (
            <p className="notice noticeGood" role="status">
              Your support access to {shortName} is open until {time(grant.expires_at)}.
            </p>
          ) : (
            <p className="notice" role="status">
              You have no support access open for {shortName}.
            </p>
          )}
          <div className="authForm">
            <a className="btn btnPrimary btnWide" href={consoleUrl}>
              Open the console
            </a>
            <Link className="textButton" href="/join">
              I am a {shortName} graduate: join the network
            </Link>
            <SignOutButton />
          </div>
        </section>
      </main>
    </>
  );
}
