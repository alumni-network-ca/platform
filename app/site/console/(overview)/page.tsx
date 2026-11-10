import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/auth/platform";
import { schoolUrl } from "@/lib/tenant/address";
import { getOrigin } from "@/lib/tenant/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ui } from "@/components/admin/parts";

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
      <div className={ui.shellTitle}>
        <div>
          <h1>Schools</h1>
          <p>
            Each school is a private network at its own address. Counts only, no alumni data here.
          </p>
        </div>
        <Button asChild>
          <Link href="/console/schools/new">New school</Link>
        </Button>
      </div>

      <div className={ui.statGrid}>
        <div className={ui.statCard}>
          <span className={ui.statLabel}>Live schools</span>
          <span className={ui.statValue}>
            {schools.filter((s) => s.status === "active").length}
          </span>
        </div>
        <div className={ui.statCard}>
          <span className={ui.statLabel}>Suspended</span>
          <span className={ui.statValue}>
            {schools.filter((s) => s.status === "suspended").length}
          </span>
        </div>
        <div className={ui.statCard}>
          <span className={ui.statLabel}>Active members</span>
          <span className={ui.statValue}>{total((s) => s.members)}</span>
        </div>
        <div className={ui.statCard}>
          <span className={ui.statLabel}>Open support grants</span>
          <span className={ui.statValue}>{total((s) => s.active_grants)}</span>
        </div>
      </div>

      <form className={ui.formRow} role="search">
        <label className={ui.field}>
          Find a school
          <Input name="q" defaultValue={q} placeholder="Name or address" />
        </label>
      </form>

      <div className={ui.tableBox}>
        <table className={ui.dataTable}>
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
              // The whole row opens the school (S1.3); the name is the one real link, stretched over the row.
              <tr key={s.id} className={ui.rowLink}>
                <td>
                  <Link className={ui.rowLinkTarget} href={`/console/schools/${s.slug}`}>
                    {s.name}
                  </Link>
                  <span className={ui.cellSub}>{new URL(schoolUrl(origin, s.slug)).host}</span>
                </td>
                <td>
                  <Badge variant={s.status === "active" ? "success" : "destructive"}>
                    {s.status === "active" ? "Live" : "Suspended"}
                  </Badge>
                </td>
                <td>{s.members}</td>
                <td>{s.pending_requests}</td>
                <td>
                  {s.staff}
                  {s.open_invitations > 0 && (
                    <span className={ui.cellSub}>{s.open_invitations} invited, not accepted</span>
                  )}
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8! text-center text-muted-foreground">
                  {query
                    ? `No school matches “${q.trim()}”.`
                    : "No schools yet. Create the first one."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
