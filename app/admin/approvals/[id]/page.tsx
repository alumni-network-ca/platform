import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/staff";
import { adminCopy, dateLabel, read } from "@/lib/admin/data";
import { DecisionForm } from "./DecisionForm";
export default async function Review({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, school } = await requireStaff("/admin/approvals/" + id, "requests.read");
  const { t, locale } = await adminCopy();
  const { data: r, error } = await supabase
    .from("access_requests")
    .select("*")
    .eq("institution_id", school.id)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!r) notFound();
  const matches = await read(supabase.rpc("access_request_matches", { p_requests: [id] }));
  return (
    <>
      <Link className="backLink" href="/admin/approvals">
        ← {t.approvals}
      </Link>
      <div className="shellTitle">
        <div>
          <h1>
            {r.first_name} {r.last_name} · {r.grad_year}
          </h1>
          <p>{dateLabel(r.created_at, locale)}</p>
        </div>
      </div>
      <div className="panelGrid">
        <section className="panel">
          <h2>{t.toldUs}</h2>
          <dl className="adminDetails">
            <dt>{t.name}</dt>
            <dd>
              {r.first_name} {r.last_name}
            </dd>
            <dt>{t.maiden_name}</dt>
            <dd>{r.maiden_name || "—"}</dd>
            <dt>{t.class}</dt>
            <dd>{r.grad_year}</dd>
            <dt>{t.email}</dt>
            <dd>{r.email}</dd>
            <dt>{t.applicantNote}</dt>
            <dd>{r.note || "—"}</dd>
            {r.applicant_reply && (
              <>
                <dt>{t.applicantReply}</dt>
                <dd>{r.applicant_reply}</dd>
              </>
            )}
          </dl>
        </section>
        {matches.map((m) => (
          <section key={m.profile_id} className="panel adminMatch">
            <h2>{t.suggested}</h2>
            <Link href={"/admin/alumni/" + m.profile_id}>
              {m.first_name} {m.last_name}, {m.grad_year}
            </Link>
            <p>{m.claimed ? t.alreadyMember : t.unclaimed}</p>
          </section>
        ))}
      </div>
      {/* TODO(ONB-04): see other possible records and duplicate resolution. */}
      {r.status === "pending" || r.status === "needs_info" ? (
        <DecisionForm id={id} year={r.grad_year} matches={matches} t={t} />
      ) : (
        <section className="panel">
          <p>{t.alreadyDecided}</p>
          <p>{r.decision_reason || r.info_request}</p>
        </section>
      )}
    </>
  );
}
