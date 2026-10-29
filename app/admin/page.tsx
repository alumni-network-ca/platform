import Link from "next/link";
import { requireStaff } from "@/lib/auth/staff";
import { adminCopy, read } from "@/lib/admin/data";
import { format } from "@/lib/i18n";
export default async function Dashboard() {
  const { supabase, school } = await requireStaff("/admin", "metrics.read");
  const { t } = await adminCopy();
  const metrics = await read(supabase.rpc("admin_dashboard", { p_inst: school.id }));
  // Request-time server rendering: the queue age is measured for this request.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const days = metrics.oldest_pending_at
    ? Math.max(0, Math.floor((now - Date.parse(metrics.oldest_pending_at)) / 86400000))
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
        <h1>{t.dashboard}</h1>
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
    </>
  );
}
