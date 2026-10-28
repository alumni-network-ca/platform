import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/auth/platform";
import { schoolBranding } from "@/lib/school";
import { schoolUrl } from "@/lib/tenant/address";
import { getOrigin } from "@/lib/tenant/server";
import { Invitations, type Invitation } from "./Invitations";

const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });

// S1.3 A school: its address, counts, school admins and settings. The launch checklist ("Open sign-ups") needs
// a school status for setup, which comes with SA-05.
export default async function SchoolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { supabase } = await requirePlatformAdmin(`/console/schools/${slug}`);
  const { data: school } = await supabase
    .from("institutions")
    .select(
      "id, name, slug, status, created_at, default_locale, reply_to_email, email_display_name, branding",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!school) notFound();

  const [summaries, invitations, created, admins] = await Promise.all([
    supabase.rpc("platform_school_summaries"),
    supabase
      .from("staff_invitations")
      .select("id, email, role, created_at, expires_at, accepted_at, revoked_at")
      .eq("institution_id", school.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("audit_log")
      .select("actor_user_id")
      .eq("institution_id", school.id)
      .eq("action", "school.created")
      .maybeSingle(),
    supabase.rpc("platform_admin_emails"),
  ]);
  const counts = summaries.data?.find((s) => s.id === school.id);
  const creator = admins.data?.find((a) => a.user_id === created.data?.actor_user_id)?.email;
  // A server component renders once per request, so reading the clock here is deliberate.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const rows: Invitation[] = (invitations.data ?? []).map((i) => ({
    id: i.id,
    email: i.email,
    role: i.role,
    ...(i.accepted_at
      ? { status: "accepted" as const, when: day(i.accepted_at) }
      : i.revoked_at
        ? { status: "revoked" as const, when: day(i.revoked_at) }
        : Date.parse(i.expires_at) <= now
          ? { status: "expired" as const, when: day(i.expires_at) }
          : { status: "open" as const, when: `Sent ${day(i.created_at)}` }),
  }));
  const origin = await getOrigin();
  const address = schoolUrl(origin, school.slug);
  const { shortName } = schoolBranding({ ...school, branding: school.branding });
  const suspended = school.status === "suspended";

  return (
    <>
      <Link className="backLink" href="/console">
        ← Schools
      </Link>
      <div className="shellTitle">
        <div>
          <h1>{school.name}</h1>
          <p>
            <a href={address}>{new URL(address).host}</a> · created {day(school.created_at)}
            {creator ? ` by ${creator}` : ""}
          </p>
        </div>
        <span className={`tag ${suspended ? "tagBad" : "tagGood"}`}>
          {suspended ? "Suspended" : "Live"}
        </span>
      </div>

      <div className="statGrid">
        <div className="statCard">
          <span className="statLabel">Members</span>
          <span className="statValue">{counts?.members ?? 0}</span>
        </div>
        <div className="statCard">
          <span className="statLabel">Pending sign-ups</span>
          <span className="statValue">{counts?.pending_requests ?? 0}</span>
        </div>
        <div className="statCard">
          <span className="statLabel">Staff</span>
          <span className="statValue">{counts?.staff ?? 0}</span>
        </div>
        <div className="statCard">
          <span className="statLabel">Open support grants</span>
          <span className="statValue">{counts?.active_grants ?? 0}</span>
        </div>
      </div>

      <div className="panelGrid">
        <Invitations slug={school.slug} invitations={rows} />
        <div className="formStack">
          <section className="panel">
            <h2>Settings</h2>
            <p className="fieldHint">
              The school&apos;s admins change these on their Settings page.
            </p>
            <dl className="detailList">
              <dt>Network name</dt>
              <dd>{shortName} Alumni Network</dd>
              <dt>Default language</dt>
              <dd>{school.default_locale === "fr" ? "Français" : "English"}</dd>
              <dt>Email sender</dt>
              <dd>{school.email_display_name ?? "Not set"}</dd>
              <dt>Replies go to</dt>
              <dd>{school.reply_to_email ?? "Not set"}</dd>
            </dl>
          </section>
          <section className="panel">
            <h2>Support and status</h2>
            <p>
              <Link href={`/console/support?school=${school.slug}`}>Open support access →</Link>
            </p>
            <p>
              <Link href={`/console/schools/${school.slug}/status`}>
                {suspended ? "Reactivate the school…" : "Suspend the school…"}
              </Link>
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
