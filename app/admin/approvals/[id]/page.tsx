import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/staff";
import { adminCopy, dateLabel, read } from "@/lib/admin/data";
import { DecisionForm } from "./DecisionForm";
import { Check } from "lucide-react";
import { BackArrow } from "@/components/icons";
import { ui } from "@/components/admin/parts";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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
      <Link className={ui.backLink} href="/admin/approvals">
        <BackArrow />
        {t.approvals}
      </Link>
      <div className={ui.shellTitle}>
        <div>
          <h1>
            {r.first_name} {r.last_name} · {r.grad_year}
          </h1>
          <p>{dateLabel(r.created_at, locale)}</p>
          <p>
            {locale === "fr"
              ? "Le compte est créé. L’approbation de cette demande donne accès au réseau des anciens."
              : "The account is created. Approving this request grants alumni access."}
          </p>
        </div>
      </div>
      <div className={ui.panelGrid}>
        <section className={ui.panel}>
          <h2>{t.toldUs}</h2>
          <dl className={ui.adminDetails}>
            <dt>{t.name}</dt>
            <dd>
              {r.first_name} {r.last_name}
            </dd>
            <dt>{t.maiden_name}</dt>
            <dd>{r.maiden_name || "—"}</dd>
            <dt>{t.class}</dt>
            <dd>{r.grad_year}</dd>
            <dt>{t.school_student_id}</dt>
            <dd>{r.school_student_id || t.notGiven}</dd>
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
          <section key={m.profile_id} className={cn(ui.panel, ui.adminMatch)} data-match="">
            <h2>{t.suggested}</h2>
            <Link href={"/admin/alumni/" + m.profile_id}>
              {m.first_name} {m.last_name}, {m.grad_year}
            </Link>
            <p>{m.claimed ? t.alreadyMember : t.unclaimed}</p>
            <p>
              {t.school_student_id}: <strong>{m.school_student_id || "—"}</strong>{" "}
              {m.id_match ? (
                <Badge variant="success">
                  <Check
                    aria-hidden
                    className="mr-1 inline-block size-3.5 align-[-0.15em]"
                    strokeWidth={3}
                  />
                  {t.sameStudentId}
                </Badge>
              ) : r.school_student_id && m.school_student_id ? (
                <Badge variant="warning">{t.differentStudentId}</Badge>
              ) : null}
            </p>
          </section>
        ))}
      </div>
      {/* TODO(ONB-04): see other possible records and duplicate resolution. */}
      {r.status === "pending" || r.status === "needs_info" ? (
        <DecisionForm id={id} year={r.grad_year} matches={matches} t={t} />
      ) : (
        <section className={ui.panel}>
          <p>{t.alreadyDecided}</p>
          <p>{r.decision_reason || r.info_request}</p>
        </section>
      )}
    </>
  );
}
