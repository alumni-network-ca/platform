import { describe, expect, it } from "vitest";
import { alumniCsv, rosterArgs, rosterFilters, rosterParams } from "@/lib/admin/roster";
import { translations } from "@/lib/i18n";
import type { AlumniExportRow } from "@/lib/database";

const from = (values: Record<string, string>) => (key: string) => values[key];

describe("roster filters", () => {
  it("reads the URL the roster and its export share", () => {
    const f = rosterFilters(from({ q: "  Cohen ", state: "published", min: "2000", max: "2010" }));
    expect(f).toEqual({ query: "Cohen", state: "published", min: 2000, max: 2010 });
    expect(rosterArgs("school", f)).toEqual({
      p_inst: "school",
      p_query: "Cohen",
      p_state: "published",
      p_class_min: 2000,
      p_class_max: 2010,
    });
    expect(rosterParams(f)).toEqual([
      ["q", "Cohen"],
      ["state", "published"],
      ["min", "2000"],
      ["max", "2010"],
    ]);
  });

  it("drops invalid values and swaps an inverted class range", () => {
    const f = rosterFilters(
      from({ state: "deleted", min: "2015", max: "1999", q: "x".repeat(300) }),
    );
    expect(f).toEqual({ query: "x".repeat(200), state: undefined, min: 1999, max: 2015 });
    expect(rosterFilters(from({ min: "99", max: "abcd" }))).toEqual({
      query: "",
      state: undefined,
      min: undefined,
      max: undefined,
    });
    expect(rosterParams(rosterFilters(from({})))).toEqual([]);
  });
});

describe("alumni CSV", () => {
  const row: AlumniExportRow = {
    id: "00000000-0000-4000-8000-000000000001",
    first_name: "Léa",
    last_name: "=Cohen",
    preferred_name: null,
    maiden_name: "Levy",
    school_student_id: "H10042",
    grad_year: 2010,
    email: "lea@example.com",
    job_title: "Engineer",
    employer: "Acme, Inc.",
    career_field_en: "Technology",
    career_field_fr: "Technologie",
    city: "Montréal",
    country: "Canada",
    state: "published",
    last_confirmed_at: "2026-10-01T12:00:00+00:00",
  };

  it("has a header in the admin's language and one neutralized row per record", () => {
    const [header, line] = alumniCsv([row], translations.fr.admin, "fr").slice(1).split("\r\n");
    expect(header?.split(",")).toContain("Matricule");
    expect(line).toBe(
      "00000000-0000-4000-8000-000000000001,Léa,'=Cohen,,Levy,H10042,2010,lea@example.com,Engineer," +
        '"Acme, Inc.",Technologie,Montréal,Canada,' +
        translations.fr.admin.published +
        ",2026-10-01",
    );
  });

  it("is a header alone when nothing matches", () => {
    expect(alumniCsv([], translations.en.admin, "en").split("\r\n")).toHaveLength(2);
  });
});
