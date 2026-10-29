import Link from "next/link";
import { staffRecord } from "@/lib/admin/records";
import { adminCopy, dateLabel, read, type Search } from "@/lib/admin/data";
import { describeAudit } from "@/lib/admin/audit";
export default async function Record({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Search;
}) {
  const { id } = await params;
  const { profile: p, supabase, school, can } = await staffRecord(id);
  const { t, locale } = await adminCopy();
  const query = await searchParams;
  const tab = query.tab === "history" || query.tab === "request" ? query.tab : "details";
  const requests = await read(
    supabase
      .from("access_requests")
      .select("*")
      .eq("institution_id", school.id)
      .eq("profile_id", id)
      .order("created_at", { ascending: false }),
  );
  const state =
    p.status !== "active"
      ? p.status
      : p.onboarding_completed_at === null
        ? "onboarding"
        : p.visibility === "members" && p.published_at
          ? "published"
          : "hidden";
  return (
    <>
      <Link className="backLink" href="/admin/alumni">
        ← {t.alumni}
      </Link>
      <section className="panel">
        <div className="shellTitle">
          <div>
            <h1>
              {p.preferred_name || p.first_name} {p.last_name}
            </h1>
            <p>{[p.grad_year, p.job_title, p.city].filter(Boolean).join(" · ")}</p>
          </div>
          <span className="tag">{state === "deleted" ? t.unknown : t[state]}</span>
        </div>
        {can("records.edit") && (
          <div className="adminActions">
            <Link className="btn btnSecondary" href={"/admin/alumni/" + id + "/edit"}>
              {t.edit}
            </Link>
            {p.status === "active" ? (
              <>
                <Link href={"/admin/alumni/" + id + "/status?action=suspended"}>{t.suspend}</Link>
                <details>
                  <summary>{t.more}</summary>
                  <div className="adminStack">
                    <Link href={"/admin/alumni/" + id + "/status?action=archived"}>
                      {t.archive}
                    </Link>
                    <Link href={"/admin/alumni/" + id + "/status?action=deceased"}>
                      {t.markDeceased}
                    </Link>
                  </div>
                </details>
              </>
            ) : (
              <Link href={"/admin/alumni/" + id + "/status?action=active"}>{t.reactivate}</Link>
            )}
          </div>
        )}
        {/* TODO(EML-05): change sign-in email. */}
      </section>
      <nav className="adminTabs" aria-label={t.details}>
        {(["details", "history", "request"] as const).map((key) => (
          <Link key={key} href={"?tab=" + key} aria-current={tab === key ? "page" : undefined}>
            {t[key]}
          </Link>
        ))}
      </nav>
      {tab === "details" ? (
        <Details profile={p} />
      ) : tab === "history" ? (
        <History id={id} requestIds={requests.map((r) => r.id)} />
      ) : (
        <section className="panel">
          {requests.length ? (
            requests.map((r) => (
              <div key={r.id}>
                <Link href={"/admin/approvals/" + r.id}>
                  {dateLabel(r.created_at, locale)} · {r.first_name} {r.last_name}
                </Link>
                <p>{r.note}</p>
                <p>{r.decision_reason || r.info_request}</p>
              </div>
            ))
          ) : (
            <p>{t.empty}</p>
          )}
        </section>
      )}
      <p className="fieldHint">{t.recordNote}</p>
    </>
  );
}
async function Details({
  profile: p,
}: {
  profile: Awaited<ReturnType<typeof staffRecord>>["profile"];
}) {
  const { supabase, school } = await staffRecord(p.id);
  const { t, locale } = await adminCopy();
  const [privateResult, emailResult, education, offers, career, channels] = await Promise.all([
    supabase
      .from("alumni_private")
      .select("*")
      .eq("institution_id", school.id)
      .eq("profile_id", p.id)
      .maybeSingle(),
    supabase.rpc("admin_profile_email", { p_profile: p.id }),
    read(
      supabase
        .from("alumni_education")
        .select("school")
        .eq("institution_id", school.id)
        .eq("profile_id", p.id),
    ),
    read(
      supabase
        .from("profile_offers")
        .select("offer_types(label_en,label_fr)")
        .eq("institution_id", school.id)
        .eq("profile_id", p.id),
    ),
    p.career_field_id
      ? supabase
          .from("career_fields")
          .select("label_en,label_fr")
          .eq("id", p.career_field_id)
          .maybeSingle()
      : null,
    read(
      supabase
        .from("profile_contact_channels")
        .select("type,value")
        .eq("institution_id", school.id)
        .eq("profile_id", p.id)
        .eq("type", "phone"),
    ),
  ]);
  const error = privateResult.error || emailResult.error || career?.error;
  if (error) throw new Error(error.message);
  const pr = privateResult.data;
  const publicFields = [
    [t.first_name, p.first_name],
    [t.last_name, p.last_name],
    [t.preferred_name, p.preferred_name],
    [
      t.careerField,
      career?.data?.[locale === "fr" ? "label_fr" : "label_en"] || p.career_field_other,
    ],
    [t.job_title, p.job_title],
    [t.employer, p.employer],
    [t.city, p.city],
    [t.country, p.country],
    [t.bio, p.bio],
    [t.education, education.map((e) => e.school).join(", ")],
    [
      t.offers,
      offers
        .map((o) => o.offer_types?.[locale === "fr" ? "label_fr" : "label_en"])
        .filter(Boolean)
        .join(", "),
    ],
  ];
  const privateFields = [
    [t.maiden_name, pr?.maiden_name],
    [t.admin_notes, pr?.admin_notes],
    [t.school_student_id, pr?.school_student_id],
    [t.email, emailResult.data],
    [t.phone, channels[0]?.value],
    [t.lastConfirmed, dateLabel(p.last_confirmed_at, locale)],
    [t.nextDue, dateLabel(p.confirmation_due_at, locale)],
  ];
  return (
    <div className="panelGrid">
      {[
        [t.publicDetails, publicFields],
        [t.privateDetails, privateFields],
      ].map(([title, fields], index) => (
        <section className="panel" key={index}>
          <h2>{title as string}</h2>
          <dl className="adminDetails">
            {(fields as (string | null | undefined)[][]).map(([label, value]) => (
              <div style={{ display: "contents" }} key={label}>
                <dt>{label}</dt>
                <dd>{value || "—"}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
async function History({ id, requestIds }: { id: string; requestIds: string[] }) {
  const { supabase, school } = await staffRecord(id);
  const { t, locale } = await adminCopy();
  const [rows, people, confirmations] = await Promise.all([
    read(
      supabase
        .from("audit_log")
        .select("*")
        .eq("institution_id", school.id)
        .in("target_id", [id, ...requestIds])
        .order("created_at", { ascending: false })
        .order("id", { ascending: false }),
    ),
    read(supabase.rpc("audit_people", { p_inst: school.id })),
    read(
      supabase
        .from("profile_confirmations")
        .select("*")
        .eq("institution_id", school.id)
        .eq("profile_id", id)
        .order("created_at", { ascending: false }),
    ),
  ]);
  const events = [
    ...rows.map((row) => ({
      id: "audit" + row.id,
      created_at: row.created_at,
      text: describeAudit(row, people, t).text,
      details: describeAudit(row, people, t).details,
    })),
    ...confirmations
      .filter(
        (c) => !rows.some((r) => r.action === "profile.confirmed" && r.created_at === c.created_at),
      )
      .map((c) => ({
        id: c.id,
        created_at: c.created_at,
        text:
          (people.find((p) => p.user_id === c.actor_user_id)?.label || t.name) +
          " " +
          t.auditConfirmed,
        details: "",
      })),
  ].sort((a, b) => b.created_at.localeCompare(a.created_at));
  return (
    <section className="panel">
      {events.length ? (
        events.map((e) => (
          <div key={e.id}>
            <strong>{e.text}</strong>
            <p>{e.details}</p>
            <span className="cellSub">{dateLabel(e.created_at, locale)}</span>
          </div>
        ))
      ) : (
        <p>{t.empty}</p>
      )}
    </section>
  );
}
