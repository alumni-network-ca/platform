import { requirePlatformAdmin } from "@/lib/auth/platform";
import { schoolUrl } from "@/lib/tenant/address";
import { getOrigin } from "@/lib/tenant/server";
import { ActiveGrants, OpenGrantForm, type ActiveGrant } from "./GrantForms";

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-CA", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

function duration(ms: number) {
  const minutes = Math.max(1, Math.round(ms / 60_000));
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours} h ${minutes % 60} min` : `${minutes} min`;
}

// S2.1 Support access: platform admins see no school data until they open a time-boxed, audited grant (ADR 0005).
export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ school?: string }>;
}) {
  const { supabase, user } = await requirePlatformAdmin("/console/support");
  const { school: preselect } = await searchParams;
  const [schools, grants, admins] = await Promise.all([
    supabase.from("institutions").select("id, name, slug").order("name"),
    supabase
      .from("platform_access_grants")
      .select("id, user_id, institution_id, reason, created_at, expires_at, revoked_at")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.rpc("platform_admin_emails"),
  ]);
  const origin = await getOrigin();
  // A server component renders once per request, so reading the clock here is deliberate.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const schoolOf = (id: string) => schools.data?.find((s) => s.id === id);
  const emailOf = (id: string) =>
    id === user.id
      ? "you"
      : (admins.data?.find((a) => a.user_id === id)?.email ?? "another platform admin");
  const isActive = (g: { revoked_at: string | null; expires_at: string }) =>
    !g.revoked_at && Date.parse(g.expires_at) > now;

  const active: ActiveGrant[] = (grants.data ?? []).filter(isActive).map((g) => ({
    id: g.id,
    school: schoolOf(g.institution_id)?.name ?? "A school",
    address: schoolUrl(origin, schoolOf(g.institution_id)?.slug ?? "", "/"),
    by: emailOf(g.user_id),
    mine: g.user_id === user.id,
    endsIn: duration(Date.parse(g.expires_at) - now),
    reason: g.reason,
  }));
  const past = (grants.data ?? []).filter((g) => !isActive(g));

  return (
    <>
      <div className="shellTitle">
        <div>
          <h1>Support access</h1>
          <p>
            Platform admins can&apos;t see a school&apos;s alumni data by default. Open a grant to
            help with a specific problem: it gives read-only access, ends on its own, and the
            school&apos;s admins see it in their audit log.
          </p>
        </div>
      </div>
      <ActiveGrants grants={active} />
      <OpenGrantForm schools={schools.data ?? []} preselect={preselect} />
      <section className="panel">
        <h2>Past grants</h2>
        {past.length === 0 ? (
          <p className="fieldHint">None yet.</p>
        ) : (
          <div className="tableBox">
            <table className="dataTable">
              <thead>
                <tr>
                  <th>School</th>
                  <th>Who</th>
                  <th>When</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {past.map((g) => (
                  <tr key={g.id}>
                    <td>{schoolOf(g.institution_id)?.name}</td>
                    <td>{emailOf(g.user_id)}</td>
                    <td>
                      {when(g.created_at)}
                      <span className="cellSub">
                        {g.revoked_at
                          ? `ended early after ${duration(Date.parse(g.revoked_at) - Date.parse(g.created_at))}`
                          : duration(Date.parse(g.expires_at) - Date.parse(g.created_at))}
                      </span>
                    </td>
                    <td>{g.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
