import Form from "next/form";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth/staff";
import { adminCopy, dateLabel, read, pageNumber, type Search } from "@/lib/admin/data";
import { format } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { ui } from "@/components/admin/parts";
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
      <div className={ui.shellTitle}>
        <div>
          <h1>{t.alumni}</h1>
          <p>{t.rosterIntro}</p>
        </div>
      </div>
      <Form action="/admin/alumni" className={ui.adminFilters}>
        <label className={ui.field}>
          {t.search}
          <Input name="q" defaultValue={query} maxLength={200} placeholder={t.rosterSearchHint} />
        </label>
        <label className={ui.field}>
          {t.status}
          <NativeSelect name="state" defaultValue={state ?? ""}>
            <option value="">{t.allStatuses}</option>
            {states.map((s) => (
              <option key={s} value={s}>
                {t[s]}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className={ui.field}>
          {t.classMin}
          <Input name="min" type="number" min={1900} max={2100} defaultValue={p.min} />
        </label>
        <label className={ui.field}>
          {t.classMax}
          <Input name="max" type="number" min={1900} max={2100} defaultValue={p.max} />
        </label>
        <SubmitButton>{t.apply}</SubmitButton>
      </Form>
      {/* TODO(FRS-04): freshness filter. TODO(EML-05): email state. TODO(EXP-01): export results. */}
      {rows.length ? (
        <div className={ui.tableBox}>
          <table className={ui.dataTable}>
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
                    <span className={ui.cellSub}>
                      {[r.job_title, r.city].filter(Boolean).join(" · ")}
                    </span>
                  </td>
                  <td>{r.grad_year}</td>
                  <td>
                    <Badge
                      variant={
                        r.state === "published"
                          ? "success"
                          : r.state === "suspended"
                            ? "destructive"
                            : "neutral"
                      }
                    >
                      {t[r.state]}
                    </Badge>
                  </td>
                  <td>{dateLabel(r.last_confirmed_at, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon={Users} title={t.empty} />
      )}
      <div className={ui.shellTitle}>
        <p>
          {format(t.recordsRange, {
            from: total ? (page - 1) * 25 + 1 : 0,
            to: Math.min(page * 25, total),
            total,
          })}
        </p>
        <div className={ui.formActions}>
          {page > 1 && <Link href={url(page - 1)}>{t.previous}</Link>}
          {page * 25 < total && <Link href={url(page + 1)}>{t.next}</Link>}
        </div>
      </div>
    </>
  );
}
