import Link from "next/link";
import { requireStaff } from "@/lib/auth/staff";
import { adminCopy, dateLabel, read, pageNumber, type Search } from "@/lib/admin/data";
export default async function Approvals({ searchParams }: { searchParams: Search }) {
  const { supabase, school } = await requireStaff("/admin/approvals", "requests.read");
  const { t, locale } = await adminCopy();
  const params = await searchParams;
  const tab = params.tab === "needs_info" || params.tab === "decided" ? params.tab : "pending";
  const page = pageNumber(params.page);
  const statuses =
    tab === "decided" ? (["approved", "rejected", "withdrawn"] as const) : ([tab] as const);
  const [rows, counts] = await Promise.all([
    read(
      supabase
        .from("access_requests")
        .select("*")
        .eq("institution_id", school.id)
        .in("status", statuses)
        .order("created_at")
        .order("id")
        .range((page - 1) * 25, page * 25 - 1),
    ),
    Promise.all(
      (["pending", "needs_info", "decided"] as const).map(async (key) => {
        const result = await supabase
          .from("access_requests")
          .select("id", { count: "exact", head: true })
          .eq("institution_id", school.id)
          .in("status", key === "decided" ? ["approved", "rejected", "withdrawn"] : [key]);
        if (result.error) throw new Error(result.error.message);
        return { key, count: result.count ?? 0 };
      }),
    ),
  ]);
  const matches = rows.length
    ? await read(supabase.rpc("access_request_matches", { p_requests: rows.map((r) => r.id) }))
    : [];
  const total = counts.find((c) => c.key === tab)?.count ?? 0;
  return (
    <>
      <div className="shellTitle">
        <div>
          <h1>{t.approvals}</h1>
          <p>{t.queueIntro}</p>
        </div>
      </div>
      <nav className="adminTabs" aria-label={t.status}>
        {counts.map((c) => (
          <Link
            key={c.key}
            href={"?tab=" + c.key}
            aria-current={tab === c.key ? "page" : undefined}
          >
            {c.key === "pending" ? t.pending : c.key === "needs_info" ? t.needs_info : t.decided} (
            {c.count})
          </Link>
        ))}
      </nav>
      <div className="tableBox">
        <table className="dataTable">
          <thead>
            <tr>
              <th>{t.applicant}</th>
              <th>{t.class}</th>
              <th>{t.match}</th>
              <th>{t.waiting}</th>
              <th>{t.actions}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const match = matches.find((m) => m.request_id === r.id);
              return (
                <tr key={r.id}>
                  <td>
                    <strong>
                      {r.first_name} {r.last_name}
                    </strong>
                    <span className="cellSub">{r.email}</span>
                  </td>
                  <td>{r.grad_year}</td>
                  <td>
                    <span
                      className={"tag " + (match?.claimed ? "tagWarn" : match ? "tagGood" : "")}
                    >
                      {match
                        ? match.claimed
                          ? t.alreadyMember
                          : match.first_name + " " + match.last_name + ", " + match.grad_year
                        : t.noMatch}
                    </span>
                  </td>
                  <td>{dateLabel(r.created_at, locale)}</td>
                  <td>
                    <Link href={"/admin/approvals/" + r.id}>{t.review}</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!rows.length && <p className="panel">{t.empty}</p>}
      </div>
      <div className="formActions">
        {page > 1 && <Link href={"?tab=" + tab + "&page=" + (page - 1)}>{t.previous}</Link>}
        {page * 25 < total && <Link href={"?tab=" + tab + "&page=" + (page + 1)}>{t.next}</Link>}
      </div>
      <p className="fieldHint">{t.matchesNote}</p>
    </>
  );
}
