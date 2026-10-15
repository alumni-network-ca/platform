import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AdminImport } from "@/components/AdminImport";
import { AdminAlumniBrowser } from "@/components/AdminAlumniBrowser";
import { Nav } from "@/components/Nav";

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin");
  }

  const { data: membership } = await supabase
    .from("institution_memberships")
    .select("institution_id,role")
    .eq("user_id", user.id)
    .in("role", ["institution_admin", "super_admin"])
    .maybeSingle();

  if (!membership) {
    return (
      <>
        <Nav />
        <main className="page">
          <div className="notice">No administrator access.</div>
        </main>
      </>
    );
  }

  const institutionId = membership.institution_id;

  /*
   * APPROVE REQUEST
   */
  async function approveRequest(formData: FormData) {
    "use server";

    const requestId = String(formData.get("requestId") || "");

    if (!requestId) {
      return;
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login?next=/admin");
    }

    const { error } = await supabase.rpc("approve_access_request", {
      p_request_id: requestId,
    });

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/admin");
  }

  /*
   * REJECT REQUEST
   */
  async function rejectRequest(formData: FormData) {
    "use server";

    const requestId = String(formData.get("requestId") || "");

    if (!requestId) {
      return;
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login?next=/admin");
    }

    const { error } = await supabase
      .from("access_requests")
      .update({
        status: "rejected",
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      })
      .eq("id", requestId);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/admin");
  }

  const [
    { count: all },
    { count: claimed },
    { count: unclaimed },
    { count: requests },
    { data: profiles },
    { data: access },
  ] = await Promise.all([
    supabase
      .from("alumni_profiles")
      .select("*", { count: "exact", head: true })
      .eq("institution_id", institutionId),

    supabase
      .from("alumni_profiles")
      .select("*", { count: "exact", head: true })
      .eq("institution_id", institutionId)
      .not("claimed_at", "is", null),

    supabase
      .from("alumni_profiles")
      .select("*", { count: "exact", head: true })
      .eq("institution_id", institutionId)
      .is("claimed_at", null),

    supabase
      .from("access_requests")
      .select("*", { count: "exact", head: true })
      .or(`institution_id.eq.${institutionId},institution_id.is.null`)
      .eq("status", "pending"),

    supabase
      .from("alumni_profiles")
      .select(
        "id,first_name,last_name,grad_year,profession,job_title,current_employer,current_city,claimed_at,is_directory_visible",
      )
      .eq("institution_id", institutionId)
      .order("last_name"),

    supabase
      .from("access_requests")
      .select("id,email,first_name,last_name,grad_year,note,status,created_at")
      .or(`institution_id.eq.${institutionId},institution_id.is.null`)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <>
      <Nav />

      <div className="adminLayout">
        <aside className="adminSide">
          <div className="eyebrow">Herzliah</div>

          <a href="#overview">Overview</a>
          <a href="#alumni">All alumni</a>
          <a href="#imports">Imports</a>
          <a href="#requests">Verification requests</a>
        </aside>

        <main className="adminMain">
          <div id="overview" className="eyebrow">
            Institution admin
          </div>

          <h1>Community dashboard</h1>

          <div className="statCards">
            <div className="statCard">
              <strong>{all ?? 0}</strong>
              <span>Total records</span>
            </div>

            <div className="statCard">
              <strong>{claimed ?? 0}</strong>
              <span>Claimed</span>
            </div>

            <div className="statCard">
              <strong>{unclaimed ?? 0}</strong>
              <span>Unclaimed</span>
            </div>

            <div className="statCard">
              <strong>{requests ?? 0}</strong>
              <span>Verification requests</span>
            </div>
          </div>

          <section id="alumni" className="card" style={{ marginTop: 24 }}>
            <h2 style={{ marginTop: 0 }}>All alumni</h2>

            <p className="muted">
              Search and review the complete Herzliah alumni database, not only recently added
              records.
            </p>

            <AdminAlumniBrowser profiles={profiles || []} />
          </section>

          <section id="imports">
            <AdminImport institutionId={institutionId} />
          </section>

          <section id="requests" className="card" style={{ marginTop: 24 }}>
            <h2 style={{ marginTop: 0 }}>Verification requests</h2>

            <p className="muted">
              Review people who could not automatically match their email to an existing Herzliah
              alumni record.
            </p>

            {!access?.length ? (
              <p className="muted">No requests yet.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Alumnus</th>
                    <th>Class</th>
                    <th>Details</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {access.map((request) => (
                    <tr key={request.id}>
                      <td>
                        <strong>
                          {request.first_name || ""} {request.last_name || ""}
                        </strong>

                        <small
                          style={{
                            display: "block",
                            color: "var(--slate)",
                          }}
                        >
                          {request.email}
                        </small>
                      </td>

                      <td>{request.grad_year || "—"}</td>

                      <td>
                        {request.note ? (
                          <small>{request.note}</small>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>

                      <td>
                        <span
                          className={`status ${
                            request.status === "approved" ? "claimed" : "unclaimed"
                          }`}
                        >
                          {request.status}
                        </span>
                      </td>

                      <td>
                        {request.status === "pending" ? (
                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              flexWrap: "wrap",
                            }}
                          >
                            <form action={approveRequest}>
                              <input type="hidden" name="requestId" value={request.id} />

                              <button type="submit" className="btn btnPrimary">
                                Approve
                              </button>
                            </form>

                            <form action={rejectRequest}>
                              <input type="hidden" name="requestId" value={request.id} />

                              <button type="submit" className="btn">
                                Reject
                              </button>
                            </form>
                          </div>
                        ) : (
                          <span className="muted">Reviewed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </main>
      </div>
    </>
  );
}
