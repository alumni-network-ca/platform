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
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import {
  rosterArgs,
  rosterFilters,
  rosterParams,
  rosterStates as states,
} from "@/lib/admin/roster";
export default async function Roster({ searchParams }: { searchParams: Search }) {
  const { supabase, school, can } = await requireStaff("/admin/alumni", "records.read");
  const { t, locale } = await adminCopy();
  const p = await searchParams;
  const page = pageNumber(p.page);
  const filters = rosterFilters((key) => p[key]);
  const { query, state } = filters;
  const args = rosterArgs(school.id, filters);
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
      {/* TODO(FRS-04): freshness filter. TODO(EML-05): email state. */}
      {can("records.export") && total > 0 && (
        // A POST of the filters the table shows (not the form's unsaved edits); the route re-checks the permission.
        <form method="post" action="/admin/alumni/export" className={ui.shellTitle}>
          {rosterParams(filters).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <p>
            {format(t.exportRows, { count: total })} · {t.exportNote}
          </p>
          <Button type="submit" variant="secondary">
            <Download aria-hidden />
            {t.exportCsv}
          </Button>
        </form>
      )}
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
