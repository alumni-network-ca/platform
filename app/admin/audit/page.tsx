import Link from "next/link";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth/staff";
import { adminCopy, dateLabel, read, pageNumber, type Search } from "@/lib/admin/data";
import { describeAudit } from "@/lib/admin/audit";
export default async function Audit({ searchParams }: { searchParams: Search }) {
  const { supabase, school } = await requireStaff("/admin/audit", "audit.read");
  const { t, locale } = await adminCopy();
  const p = await searchParams;
  const page = pageNumber(p.page);
  const types = ["approvals", "records", "exports", "staff", "settings", "support"] as const;
  const type = types.find((key) => key === p.type);
  const who = p.who && /^[a-f0-9-]{36}$/i.test(p.who) ? p.who : undefined;
  const people = await read(supabase.rpc("audit_people", { p_inst: school.id }));
  let query = supabase
    .from("audit_log")
    .select("*", { count: "exact" })
    .eq("institution_id", school.id);
  if (who) query = query.eq("actor_user_id", who);
  if (type === "approvals") query = query.like("action", "access_request.%");
  if (type === "records") query = query.or("action.like.profile.%,action.like.consent.%");
  if (type === "exports") query = query.or("action.like.export.%,action.eq.profile.data_exported");
  if (type === "staff") query = query.like("action", "staff.%");
  if (type === "settings") query = query.or("action.like.school.%,action.like.template.%");
  if (type === "support") query = query.eq("actor_kind", "system_admin");
  const {
    data: rows,
    count,
    error,
  } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range((page - 1) * 25, page * 25 - 1);
  if (error) throw new Error(error.message);
  const url = (kind: string | undefined, n = 1) => {
    const q = new URLSearchParams();
    if (kind) q.set("type", kind);
    if (who) q.set("who", who);
    if (n > 1) q.set("page", String(n));
    return "?" + q.toString();
  };
  if (!rows.length && page > 1) redirect(url(type));
  return (
    <>
      <div className="shellTitle">
        <div>
          <h1>{t.audit}</h1>
          <p>{t.auditIntro}</p>
        </div>
      </div>
      <form className="adminFilters">
        <label className="field">
          {t.who}
          <select className="input" name="who" defaultValue={who ?? ""}>
            <option value="">{t.anyone}</option>
            {people.map((person) => (
              <option key={person.user_id} value={person.user_id}>
                {person.kind === "support" ? t.support : person.label}
              </option>
            ))}
          </select>
        </label>
        {type && <input type="hidden" name="type" value={type} />}
        <button className="btn btnPrimary">{t.apply}</button>
      </form>
      <nav className="adminChips" aria-label={t.type}>
        <Link className="tag" href={url(undefined)} aria-current={!type ? "page" : undefined}>
          {t.allTypes}
        </Link>
        {types.map((key) => (
          <Link
            key={key}
            className="tag"
            href={url(key)}
            aria-current={key === type ? "page" : undefined}
          >
            {t[key]}
          </Link>
        ))}
      </nav>
      <div className="tableBox">
        <table className="dataTable">
          <thead>
            <tr>
              <th>{t.when}</th>
              <th>{t.who}</th>
              <th>{t.what}</th>
              <th>{t.details}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const d = describeAudit(row, people, t);
              return (
                <tr
                  key={row.id}
                  className={row.actor_kind === "system_admin" ? "adminSupport" : undefined}
                >
                  <td>{dateLabel(row.created_at, locale)}</td>
                  <td>{d.actor}</td>
                  <td>{d.targetHref ? <Link href={d.targetHref}>{d.what}</Link> : d.what}</td>
                  <td>{d.details || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!rows.length && <p className="panel">{t.empty}</p>}
      </div>
      <div className="formActions">
        {page > 1 && <Link href={url(type, page - 1)}>{t.previous}</Link>}
        {page * 25 < (count ?? 0) && <Link href={url(type, page + 1)}>{t.next}</Link>}
      </div>
      <p className="fieldHint">{t.auditNote}</p>
    </>
  );
}
