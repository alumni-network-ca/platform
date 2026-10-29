import Link from "next/link";
import { requireStaff } from "@/lib/auth/staff";
import { adminCopy, dateLabel, read, type Search } from "@/lib/admin/data";
import { describeAudit } from "@/lib/admin/audit";
import { periodSince } from "@/lib/admin/period";
import { format } from "@/lib/i18n";
export default async function Dashboard({ searchParams }: { searchParams: Search }) {
  const { supabase, school, user } = await requireStaff("/admin", "metrics.read");
  const { t, locale } = await adminCopy();
  const params = await searchParams;
  const period = params.period === "year" || params.period === "all" ? params.period : "30d";
  // Request-time server rendering: metrics and queue age use the time of this request.
  const now = new Date();
  const [metrics, activity, people, profileResult, requestResult] = await Promise.all([
    read(supabase.rpc("admin_dashboard", { p_inst: school.id, p_since: periodSince(period, now) })),
    read(
      supabase
        .from("audit_log")
        .select("*")
        .eq("institution_id", school.id)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(4),
    ),
    read(supabase.rpc("audit_people", { p_inst: school.id })),
    supabase
      .from("alumni_profiles")
      .select("first_name,preferred_name")
      .eq("institution_id", school.id)
      .eq("user_id", user.id)
      .neq("status", "deleted")
      .maybeSingle(),
    supabase
      .from("access_requests")
      .select("first_name")
      .eq("institution_id", school.id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (profileResult.error || requestResult.error)
    throw new Error(profileResult.error?.message || requestResult.error?.message);
  const name =
    profileResult.data?.preferred_name ||
    profileResult.data?.first_name ||
    requestResult.data?.first_name;
  const days = metrics.oldest_pending_at
    ? Math.max(0, Math.floor((now.getTime() - Date.parse(metrics.oldest_pending_at)) / 86400000))
    : 0;
  const cards = [
    { key: "pending", href: "/admin/approvals" },
    { key: "needs_info", href: "/admin/approvals?tab=needs_info" },
    { key: "approved_not_published", href: "/admin/alumni?state=onboarding" },
    { key: "published", href: "/admin/alumni?state=published" },
  ] as const;
  return (
    <>
      <div className="shellTitle">
        <div>
          <h1>{t.dashboard}</h1>
          <p>{name ? format(t.greetingName, { name }) : t.greeting}</p>
        </div>
        <form className="adminFilters">
          <label className="field">
            {t.period}
            <select className="input" name="period" defaultValue={period}>
              <option value="30d">{t.period30}</option>
              <option value="year">{t.periodYear}</option>
              <option value="all">{t.periodAll}</option>
            </select>
          </label>
          <button className="btn btnSecondary">{t.apply}</button>
        </form>
      </div>
      <Link className="adminHero" href="/admin/approvals">
        <span>
          <small>{t.needsYou}</small>
          <strong>
            {metrics.pending ? format(t.hero, { count: metrics.pending, days }) : t.noPending}
          </strong>
        </span>
        <span>{t.reviewQueue}</span>
      </Link>
      <div className="statGrid">
        {cards.map(({ key, href }) => (
          <Link key={key} href={href} className="statCard">
            <span className="statLabel">{t[key]}</span>
            <span className="statValue">{metrics[key]}</span>
          </Link>
        ))}
      </div>
      {/* TODO(FRS-04), TODO(EML-05): overdue confirmations and bounced-email metrics. */}
      <section className="panel">
        <div className="shellTitle">
          <h2>{t.recent}</h2>
          <Link href="/admin/audit">{t.audit} →</Link>
        </div>
        {activity.length ? (
          activity.map((row) => {
            const d = describeAudit(row, people, t);
            return (
              <div
                key={row.id}
                className={row.actor_kind === "system_admin" ? "panel panelWarn" : ""}
              >
                {d.targetHref ? <Link href={d.targetHref}>{d.text}</Link> : <span>{d.text}</span>}
                <span className="cellSub">{dateLabel(row.created_at, locale)}</span>
              </div>
            );
          })
        ) : (
          <p>{t.empty}</p>
        )}
      </section>
    </>
  );
}
