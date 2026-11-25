import type { AlumniExportRow, RosterState } from "@/lib/database";
import type { AdminCopy } from "./forms";
import { csvDocument } from "@/lib/csv";

// The roster's filters (ADM-03), read once from the URL or the export form, so the roster page and its CSV export
// (EXP-01) always ask the database for the same rows.

export const rosterStates = [
  "published",
  "hidden",
  "onboarding",
  "suspended",
  "archived",
  "deceased",
] as const satisfies readonly RosterState[];

export type RosterFilters = {
  query: string;
  state?: RosterState;
  min?: number;
  max?: number;
};

const year = (v?: string | null) =>
  v && /^\d{4}$/.test(v) && +v >= 1900 && +v <= 2100 ? +v : undefined;

/** Reads q, state, min and max. Anything invalid is dropped; an inverted class range is swapped. */
export function rosterFilters(get: (key: string) => string | null | undefined): RosterFilters {
  const state = rosterStates.find((s) => s === get("state"));
  let min = year(get("min"));
  let max = year(get("max"));
  if (min && max && min > max) [min, max] = [max, min];
  return { query: (get("q") ?? "").trim().slice(0, 200), state, min, max };
}

/** The arguments admin_roster and admin_export_alumni share. */
export const rosterArgs = (school: string, f: RosterFilters) => ({
  p_inst: school,
  p_query: f.query || undefined,
  p_state: f.state,
  p_class_min: f.min,
  p_class_max: f.max,
});

/** The filters as form fields or a query string, without empty ones. */
export function rosterParams(f: RosterFilters): [string, string][] {
  const out: [string, string][] = [];
  if (f.query) out.push(["q", f.query]);
  if (f.state) out.push(["state", f.state]);
  if (f.min) out.push(["min", String(f.min)]);
  if (f.max) out.push(["max", String(f.max)]);
  return out;
}

/** The export file: a header row in the admin's language, then one row per record. */
export function alumniCsv(rows: AlumniExportRow[], t: AdminCopy, locale: "en" | "fr") {
  const columns: [string, (r: AlumniExportRow) => string | number | null][] = [
    [t.recordId, (r) => r.id],
    [t.first_name, (r) => r.first_name],
    [t.last_name, (r) => r.last_name],
    [t.preferred_name, (r) => r.preferred_name],
    [t.maiden_name, (r) => r.maiden_name],
    [t.school_student_id, (r) => r.school_student_id],
    [t.grad_year, (r) => r.grad_year],
    [t.email, (r) => r.email],
    [t.job_title, (r) => r.job_title],
    [t.employer, (r) => r.employer],
    [t.careerField, (r) => (locale === "fr" ? r.career_field_fr : r.career_field_en)],
    [t.city, (r) => r.city],
    [t.country, (r) => r.country],
    [t.status, (r) => t[r.state]],
    [t.lastConfirmed, (r) => r.last_confirmed_at?.slice(0, 10) ?? null],
  ];
  return csvDocument([
    columns.map(([label]) => label),
    ...rows.map((r) => columns.map(([, value]) => value(r))),
  ]);
}
