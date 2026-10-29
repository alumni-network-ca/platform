import Link from "next/link";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth/staff";
import { adminCopy, dateLabel, read, pageNumber, type Search } from "@/lib/admin/data";
import { format } from "@/lib/i18n";
const states = ["published", "hidden", "onboarding", "suspended", "archived", "deceased"] as const;
export default async function Roster({ searchParams }: { searchParams: Search }) {
  const { supabase, school } = await requireStaff("/admin/alumni", "records.read");
  const { t, locale } = await adminCopy();
  const p = await searchParams;
  const page = pageNumber(p.page);
  const year = (v?: string) =>
    v && /^\d{4}$/.test(v) && +v >= 1900 && +v <= 2100 ? +v : undefined;
  const state = states.find((s) => s === p.state);
  const query = (p.q ?? "").trim().slice(0, 200);
  const args = {
    p_inst: school.id,
    p_query: query || undefined,
    p_state: state,
    p_class_min: year(p.min),
    p_class_max: year(p.max),
  };
  if (args.p_class_min && args.p_class_max && args.p_class_min > args.p_class_max)
    [args.p_class_min, args.p_class_max] = [args.p_class_max, args.p_class_min];
  const rows = await read(
    supabase.rpc("admin_roster", { ...args, p_limit: 25, p_offset: (page - 1) * 25 }),
  );
  const url = (n: number) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(p)) if (k !== "page" && v) next.set(k, v);
    next.set("page", String(n));
    return "?" + next.toString();
  };
  if (!rows.length && page > 1) redirect(url(1));
  const total = rows[0]?.total_count ?? 0;
  return (
    <>
      <div className="shellTitle">
        <div>
          <h1>{t.alumni}</h1>
          <p>{t.rosterIntro}</p>
        </div>
      </div>
      <form className="adminFilters">
        <label className="field">
          {t.search}
          <input className="input" name="q" defaultValue={query} maxLength={200} />
        </label>
        <label className="field">
          {t.status}
          <select className="input" name="state" defaultValue={state ?? ""}>
            <option value="">{t.allStatuses}</option>
            {states.map((s) => (
              <option key={s} value={s}>
                {t[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          {t.classMin}
          <input
            className="input"
            name="min"
            type="number"
            min={1900}
            max={2100}
            defaultValue={p.min}
          />
        </label>
        <label className="field">
          {t.classMax}
          <input
            className="input"
            name="max"
            type="number"
            min={1900}
            max={2100}
            defaultValue={p.max}
          />
        </label>
        <button className="btn btnPrimary">{t.apply}</button>
      </form>
      {/* TODO(FRS-04): freshness filter. TODO(EML-05): email state. TODO(EXP-01): export results. */}
      <div className="tableBox">
        <table className="dataTable">
          <thead>
            <tr>
              <th>{t.name}</th>
              <th>{t.class}</th>
              <th>{t.status}</th>
              <th>{t.lastConfirmed}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link href={"/admin/alumni/" + r.id}>
                    {r.preferred_name || r.first_name} {r.last_name}
                  </Link>
                  <span className="cellSub">
                    {[r.job_title, r.city].filter(Boolean).join(" · ")}
                  </span>
                </td>
                <td>{r.grad_year}</td>
                <td>
                  <span
                    className={
                      "tag " +
                      (r.state === "published"
                        ? "tagGood"
                        : r.state === "suspended"
                          ? "tagBad"
                          : "")
                    }
                  >
                    {t[r.state]}
                  </span>
                </td>
                <td>{dateLabel(r.last_confirmed_at, locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="panel">{t.empty}</p>}
      </div>
      <div className="shellTitle">
        <p>
          {format(t.recordsRange, {
            from: total ? (page - 1) * 25 + 1 : 0,
            to: Math.min(page * 25, total),
            total,
          })}
        </p>
        <div className="formActions">
          {page > 1 && <Link href={url(page - 1)}>{t.previous}</Link>}
          {page * 25 < total && <Link href={url(page + 1)}>{t.next}</Link>}
        </div>
      </div>
    </>
  );
}
