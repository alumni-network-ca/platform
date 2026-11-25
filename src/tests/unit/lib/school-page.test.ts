import { describe, expect, it } from "vitest";
import {
  aboutFor,
  EMPTY_SCHOOL_PAGE,
  hasSchoolPage,
  hostOf,
  isHttpsUrl,
  schoolPageFromRow,
  schoolPagePayload,
  type SchoolPageRow,
} from "@/lib/school-page";

const row = (over: Partial<SchoolPageRow> = {}): SchoolPageRow => ({
  website_url: null,
  donate_url: null,
  social_links: {},
  about_en: null,
  about_fr: null,
  address: null,
  map_url: null,
  office_name: null,
  office_email: null,
  office_phone: null,
  ...over,
});

const form = (values: Record<string, string>) => (name: string) => values[name] ?? "";

describe("isHttpsUrl", () => {
  it("accepts https links with a host", () => {
    expect(isHttpsUrl("https://www.herzliah.ca")).toBe(true);
    expect(isHttpsUrl("https://give.herzliah.ca/campaign?x=1")).toBe(true);
  });
  it("refuses other schemes, credentials, spaces and bare hosts", () => {
    for (const bad of [
      "http://herzliah.ca",
      "javascript:alert(1)",
      "https://user:pw@herzliah.ca",
      "https://herzliah.ca/a b",
      "https://localhost",
      "herzliah.ca",
      "",
    ])
      expect(isHttpsUrl(bad), bad).toBe(false);
  });
  it("limits the length to 500", () => {
    expect(isHttpsUrl(`https://a.ca/${"x".repeat(500)}`)).toBe(false);
  });
});

describe("schoolPageFromRow", () => {
  it("is empty without a row", () => {
    expect(schoolPageFromRow(null)).toEqual(EMPTY_SCHOOL_PAGE);
    expect(hasSchoolPage(schoolPageFromRow(null))).toBe(false);
  });
  it("keeps known networks with https links only", () => {
    const page = schoolPageFromRow(
      row({
        social_links: {
          instagram: "https://instagram.com/herzliah",
          myspace: "https://myspace.com/x",
          x: "javascript:alert(1)",
          facebook: 5,
        },
      }),
    );
    expect(page.social).toEqual({ instagram: "https://instagram.com/herzliah" });
  });
  it("treats blank text as missing", () => {
    expect(schoolPageFromRow(row({ about_en: "  ", address: "" })).aboutEn).toBeNull();
  });
  it("is shown as soon as one field is filled", () => {
    expect(hasSchoolPage(schoolPageFromRow(row({ office_phone: "514-555-0100" })))).toBe(true);
    expect(
      hasSchoolPage(schoolPageFromRow(row({ social_links: { x: "https://x.com/herzliah" } }))),
    ).toBe(true);
  });
});

describe("aboutFor", () => {
  it("falls back to the other language", () => {
    const page = schoolPageFromRow(row({ about_en: "A school." }));
    expect(aboutFor(page, "fr")).toBe("A school.");
    expect(aboutFor(schoolPageFromRow(row({ about_fr: "Une école." })), "en")).toBe("Une école.");
  });
  it("prefers the reader's language", () => {
    const both = schoolPageFromRow(row({ about_en: "A school.", about_fr: "Une école." }));
    expect(aboutFor(both, "fr")).toBe("Une école.");
    expect(aboutFor(both, "en")).toBe("A school.");
  });
});

describe("hostOf", () => {
  it("names the host without www", () => {
    expect(hostOf("https://www.give.herzliah.ca/x")).toBe("give.herzliah.ca");
  });
});

describe("schoolPagePayload", () => {
  it("accepts an empty form", () => {
    expect(schoolPagePayload(form({}))).toHaveProperty("payload");
  });
  it("builds the payload", () => {
    const result = schoolPagePayload(
      form({
        website_url: "https://www.herzliah.ca",
        social_instagram: "https://instagram.com/herzliah",
        office_email: "Alumni@Herzliah.CA",
        about_fr: "Une école.",
      }),
    );
    expect(result).toMatchObject({
      payload: {
        website_url: "https://www.herzliah.ca",
        social_links: { instagram: "https://instagram.com/herzliah" },
        office_email: "alumni@herzliah.ca",
        about_fr: "Une école.",
      },
    });
  });
  it("refuses bad links, a bad email and long text", () => {
    const bad: Record<string, string>[] = [
      { donate_url: "http://give.herzliah.ca" },
      { map_url: "javascript:alert(1)" },
      { social_x: "ftp://x.com/a" },
      { office_email: "not an email" },
      { about_en: "x".repeat(4001) },
      { address: "x".repeat(301) },
    ];
    for (const values of bad)
      expect(schoolPagePayload(form(values)), JSON.stringify(values)).toEqual({
        error: "invalid",
      });
  });
});
