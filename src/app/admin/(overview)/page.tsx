import Form from "next/form";
import Link from "next/link";
import { requireStaff } from "@/lib/auth/staff";
import { adminCopy, dateLabel, read, type Search } from "@/lib/admin/data";
import { describeAudit } from "@/lib/admin/audit";
import { periodSince } from "@/lib/admin/period";
import { format } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { ForwardArrow } from "@/components/icons";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/utils";
import { ui } from "@/components/admin/parts";
export default async function Dashboard({ searchParams }: { searchParams: Search }) {
  const { supabase, school, user, role, can } = await requireStaff("/admin", "metrics.read");
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
  const metadataName = user.user_metadata?.first_name;
  const name =
    profileResult.data?.preferred_name ||
    profileResult.data?.first_name ||
    requestResult.data?.first_name ||
    (typeof metadataName === "string" ? metadataName.trim() : "");
  // A6.6: once, right after accepting a staff invitation (the accept redirect carries ?welcome=1).
  type Start = { href: string; title: string; help: string };
  const starts: (Start | false)[] = [
    can("requests.read") && {
      href: "/admin/approvals",
      title: t.welcomeApprovals,
      help: t.welcomeApprovalsHelp,
    },
    can("records.read") && {
      href: "/admin/alumni",
      title: t.welcomeAlumni,
      help: t.welcomeAlumniHelp,
    },
    can("audit.read") && { href: "/admin/audit", title: t.welcomeAudit, help: t.welcomeAuditHelp },
  ];
  const welcomeStarts = starts.filter((start): start is Start => !!start);
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
      <div className={ui.shellTitle}>
        <div>
          <h1>{t.dashboard}</h1>
          <p>{name ? format(t.greetingName, { name }) : t.greeting}</p>
        </div>
        <Form action="/admin" className={ui.adminFilters}>
          <label className={ui.field}>
            {t.period}
            <NativeSelect name="period" defaultValue={period}>
              <option value="30d">{t.period30}</option>
              <option value="year">{t.periodYear}</option>
              <option value="all">{t.periodAll}</option>
            </NativeSelect>
          </label>
          <SubmitButton variant="secondary">{t.apply}</SubmitButton>
        </Form>
      </div>
      {params.welcome === "1" && (
        <section className={ui.welcomeBanner} aria-labelledby="welcome-title">
          <div className={ui.welcomeHead}>
            <div>
              <h2 id="welcome-title">
                {name ? format(t.welcomeTitle, { name }) : t.welcomeTitleNoName}
              </h2>
              <p>
                {format(t.welcomeLead, {
                  role: role === "reviewer" ? t.welcomeReviewer : t.welcomeSchoolAdmin,
                  school: school.name,
                })}
              </p>
            </div>
            <Button asChild variant="secondary">
              <Link href="/admin">{t.dismiss}</Link>
            </Button>
          </div>
          <div className={ui.welcomeCards}>
            {welcomeStarts.map((start) => (
              <Link key={start.href} href={start.href} className={ui.welcomeCard}>
                <strong>{start.title}</strong>
                <span>{start.help}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
      <Link className={ui.adminHero} href="/admin/approvals">
        <span>
          <small>{t.needsYou}</small>
          <strong>
            {metrics.pending ? format(t.hero, { count: metrics.pending, days }) : t.noPending}
          </strong>
        </span>
        <span>
          {t.reviewQueue}
          <ForwardArrow />
        </span>
      </Link>
      <div className={ui.statGrid}>
        {cards.map(({ key, href }) => (
          <Link key={key} href={href} className={ui.statCard}>
            <span className={ui.statLabel}>{t[key]}</span>
            <span className={ui.statValue}>{metrics[key]}</span>
          </Link>
        ))}
      </div>
      {/* TODO(FRS-04), TODO(EML-05): overdue confirmations and bounced-email metrics. */}
      <section className={ui.panel}>
        <div className={ui.shellTitle}>
          <h2>{t.recent}</h2>
          <Link href="/admin/audit">
            {t.audit}
            <ForwardArrow />
          </Link>
        </div>
        {activity.length ? (
          activity.map((row) => {
            const d = describeAudit(row, people, t);
            return (
              <div
                key={row.id}
                className={
                  row.actor_kind === "system_admin" ? cn(ui.panel, ui.panelWarn) : undefined
                }
              >
                {d.targetHref ? <Link href={d.targetHref}>{d.text}</Link> : <span>{d.text}</span>}
                <span className={ui.cellSub}>{dateLabel(row.created_at, locale)}</span>
              </div>
            );
          })
        ) : (
          <p className="text-muted-foreground">{t.empty}</p>
        )}
      </section>
    </>
  );
}
