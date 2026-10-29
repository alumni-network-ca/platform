import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/auth/platform";
import { schoolUrl } from "@/lib/tenant/address";
import { getOrigin } from "@/lib/tenant/server";

// S1.1 Console: all schools. Counts only, never alumni data (ADR 0005).
export default async function SchoolsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { supabase } = await requirePlatformAdmin("/console");
  const { q = "" } = await searchParams;
  const origin = await getOrigin();
  const { data, error } = await supabase.rpc("platform_school_summaries");
  if (error) throw new Error(`Could not load the schools: ${error.message}`);

  const schools = data ?? [];
  const query = q.trim().toLowerCase();
  const shown = query
    ? schools.filter((s) => `${s.name} ${s.slug}`.toLowerCase().includes(query))
    : schools;
  const total = (pick: (s: (typeof schools)[number]) => number) =>
    schools.reduce((sum, s) => sum + pick(s), 0);

  return (
    <>
      <div className="shellTitle">
        <div>
          <h1>Schools</h1>
          <p>
            Each school is a private network at its own address. Counts only, no alumni data here.
          </p>
        </div>
        <Link className="btn btnPrimary" href="/console/schools/new">
          New school
        </Link>
      </div>

      <div className="statGrid">
        <div className="statCard">
          <span className="statLabel">Live schools</span>
          <span className="statValue">{schools.filter((s) => s.status === "active").length}</span>
        </div>
        <div className="statCard">
          <span className="statLabel">Suspended</span>
          <span className="statValue">
            {schools.filter((s) => s.status === "suspended").length}
          </span>
        </div>
        <div className="statCard">
          <span className="statLabel">Active members</span>
          <span className="statValue">{total((s) => s.members)}</span>
        </div>
        <div className="statCard">
          <span className="statLabel">Open support grants</span>
          <span className="statValue">{total((s) => s.active_grants)}</span>
        </div>
      </div>

      <form className="formRow" role="search">
        <label className="field">
          Find a school
          <input className="input" name="q" defaultValue={q} placeholder="Name or address" />
        </label>
      </form>

      <div className="tableBox">
        <table className="dataTable">
          <thead>
            <tr>
              <th>School</th>
              <th>Status</th>
              <th>Members</th>
              <th>Pending sign-ups</th>
              <th>Staff</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((s) => (
              <tr key={s.id}>
                <td>
                  <Link href={`/console/schools/${s.slug}`}>{s.name}</Link>
                  <span className="cellSub">{new URL(schoolUrl(origin, s.slug)).host}</span>
                </td>
                <td>
                  <span className={`tag ${s.status === "active" ? "tagGood" : "tagBad"}`}>
                    {s.status === "active" ? "Live" : "Suspended"}
                  </span>
                </td>
                <td>{s.members}</td>
                <td>{s.pending_requests}</td>
                <td>
                  {s.staff}
                  {s.open_invitations > 0 && (
                    <span className="cellSub">{s.open_invitations} invited, not accepted</span>
                  )}
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={5}>No school matches “{q}”.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
