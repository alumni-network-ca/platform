import { describe, expect, it } from "vitest";
import {
  initials,
  isStep,
  optionsFor,
  parseAbout,
  parseCareer,
  parseChannels,
  parseEducation,
  parseOffers,
  parsePublish,
  readForm,
  resumeStep,
  signedInRecently,
  type FormReader,
} from "./fields";

const form = (entries: [string, string][]): FormReader => {
  const data = new FormData();
  for (const [name, value] of entries) data.append(name, value);
  return readForm(data);
};

describe("steps", () => {
  it("resumes after the steps already saved", () => {
    expect(resumeStep(0)).toBe("welcome");
    expect(resumeStep(2)).toBe("education");
    expect(resumeStep(6)).toBe("publish");
    expect(resumeStep(9)).toBe("publish");
    expect(resumeStep(-1)).toBe("welcome");
  });

  it("knows its step names", () => {
    expect(isStep("career")).toBe(true);
    expect(isStep("payment")).toBe(false);
  });
});

describe("parseAbout", () => {
  it("trims, keeps known languages and the name at school", () => {
    expect(
      parseAbout(
        form([
          ["first_name", " Dana "],
          ["last_name", "Levy"],
          ["maiden_name", "Benhamou"],
          ["city", "Toronto"],
          ["country", "Canada"],
          ["bio", ""],
          ["languages", "en"],
          ["languages", "he"],
          ["languages", "klingon"],
        ]),
      ),
    ).toEqual({
      ok: true,
      data: {
        profile: {
          first_name: "Dana",
          last_name: "Levy",
          city: "Toronto",
          country: "Canada",
          bio: "",
          languages: ["en", "he"],
        },
        private: { maiden_name: "Benhamou" },
      },
    });
  });

  it("requires both names and limits the bio", () => {
    expect(
      parseAbout(
        form([
          ["first_name", ""],
          ["last_name", "Levy"],
          ["bio", "x".repeat(301)],
        ]),
      ),
    ).toEqual({
      ok: false,
      errors: { first_name: { code: "required" }, bio: { code: "tooLong", max: 300 } },
    });
  });
});

describe("parseEducation", () => {
  it("drops blank rows and checks the others", () => {
    const result = parseEducation(
      form([
        ["school", "McGill"],
        ["degree", "BEng"],
        ["field_of_study", ""],
        ["graduation_year", "2018"],
        ["school", ""],
        ["degree", ""],
        ["field_of_study", ""],
        ["graduation_year", ""],
        ["school", ""],
        ["degree", "MBA"],
        ["field_of_study", ""],
        ["graduation_year", "20"],
      ]),
    );
    expect(result).toEqual({
      ok: false,
      errors: { "school.2": { code: "required" }, "graduation_year.2": { code: "year" } },
    });
    expect(
      parseEducation(
        form([
          ["school", "McGill"],
          ["degree", ""],
          ["field_of_study", ""],
          ["graduation_year", ""],
        ]),
      ),
    ).toEqual({
      ok: true,
      data: {
        education: [{ school: "McGill", degree: "", field_of_study: "", graduation_year: null }],
      },
    });
  });
});

describe("parseCareer", () => {
  const roles = (title: string, start: string, end: string): [string, string][] => [
    ["role_title", title],
    ["role_employer", "Shopify"],
    ["role_location", "Ottawa"],
    ["role_start", start],
    ["role_end", end],
  ];

  it("keeps the current role on the profile and earlier roles as experience", () => {
    expect(
      parseCareer(
        form([
          ["career_field_id", "tech"],
          ["job_title", "Engineer"],
          ["employer", "Northline"],
          ...roles("Developer", "2019-03", "2023-11"),
        ]),
        ["tech"],
      ),
    ).toEqual({
      ok: true,
      data: {
        profile: { career_field_id: "tech", job_title: "Engineer", employer: "Northline" },
        experience: [
          {
            job_title: "Developer",
            employer: "Shopify",
            location: "Ottawa",
            start_year: 2019,
            start_month: 3,
            end_year: 2023,
            end_month: 11,
            is_current: false,
          },
        ],
      },
    });
  });

  it("treats an empty end as a role held now", () => {
    const result = parseCareer(form(roles("Founder", "2021-06", "")), []);
    expect(result.ok && result.data.experience[0]).toMatchObject({
      start_year: 2021,
      start_month: 6,
      end_year: null,
      end_month: null,
      is_current: true,
    });
  });

  it("accepts a bare year where the browser has no month picker, and any year", () => {
    const result = parseCareer(form(roles("Clerk", "1850", "1852-02")), []);
    expect(result.ok && result.data.experience[0]).toMatchObject({
      start_year: 1850,
      start_month: null,
      end_year: 1852,
      end_month: 2,
    });
  });

  it("refuses an unknown field, a role without a title, a malformed date and dates out of order", () => {
    expect(
      parseCareer(form([["career_field_id", "astrology"], ...roles("", "2020-05", "2020-04")]), [
        "tech",
      ]),
    ).toEqual({
      ok: false,
      errors: {
        career_field_id: { code: "careerField" },
        "role_title.0": { code: "required" },
        "role_end.0": { code: "yearOrder" },
      },
    });
    expect(parseCareer(form(roles("Clerk", "sas", "2020-13")), [])).toEqual({
      ok: false,
      errors: { "role_start.0": { code: "month" }, "role_end.0": { code: "month" } },
    });
  });

  it("accepts no field at all", () => {
    expect(parseCareer(form([["career_field_id", ""]]), ["tech"]).ok).toBe(true);
  });
});

describe("parseOffers", () => {
  it("keeps the school's options once each", () => {
    expect(
      parseOffers(
        form([
          ["offers", "mentoring"],
          ["offers", "mentoring"],
          ["offers", "bribes"],
        ]),
        ["mentoring", "career_advice"],
      ),
    ).toEqual({ offers: ["mentoring"] });
  });
});

describe("parseChannels", () => {
  it("normalizes phones and links, and keeps each one's public choice", () => {
    expect(
      parseChannels(
        form([
          ["email", "dana@example.test"],
          ["email_public", "on"],
          ["phone", "+1 (514) 555-0123"],
          ["linkedin", "www.linkedin.com/in/dana"],
          ["linkedin_public", "on"],
          ["website", ""],
        ]),
      ),
    ).toEqual({
      ok: true,
      data: {
        channels: [
          { type: "email", value: "dana@example.test", is_public: true },
          { type: "phone", value: "+15145550123", is_public: false },
          { type: "linkedin", value: "https://www.linkedin.com/in/dana", is_public: true },
        ],
      },
    });
  });

  it("refuses what the database would", () => {
    const result = parseChannels(
      form([
        ["email", "dana"],
        ["phone", "514 555 0123"],
        ["facebook", "https://example.test/dana"],
        ["website", "http://dana.test"],
      ]),
    );
    expect(result).toEqual({
      ok: false,
      errors: {
        email: { code: "email" },
        phone: { code: "phone" },
        facebook: { code: "platform", channel: "facebook" },
        website: { code: "url" },
      },
    });
  });
});

describe("parsePublish", () => {
  it("needs the consent, and keeps hidden unless members is chosen", () => {
    expect(parsePublish(form([["visibility", "members"]]))).toEqual({
      ok: false,
      errors: { consent: { code: "consent" } },
    });
    expect(
      parsePublish(
        form([
          ["visibility", "members"],
          ["consent", "on"],
        ]),
      ),
    ).toEqual({
      ok: true,
      data: { visibility: "members" },
    });
    expect(
      parsePublish(
        form([
          ["visibility", "everyone"],
          ["consent", "on"],
        ]),
      ),
    ).toEqual({
      ok: true,
      data: { visibility: "hidden" },
    });
  });
});

describe("optionsFor", () => {
  const row = (
    key: string,
    institution_id: string | null,
    sort_order: number,
    is_active = true,
  ) => ({
    key,
    institution_id,
    sort_order,
    is_active,
  });

  it("lets a school override or retire a platform option, and ignores other schools", () => {
    expect(
      optionsFor(
        [
          row("law", null, 2),
          row("tech", null, 1),
          row("tech", "mine", 5),
          row("law", "mine", 2, false),
          row("art", "other", 0),
        ],
        "mine",
      ),
    ).toEqual([row("tech", "mine", 5)]);
  });
});

describe("initials", () => {
  it("takes the first letters", () => expect(initials(" dana", "levy")).toBe("DL"));
});

describe("signedInRecently", () => {
  const now = new Date("2026-11-01T12:00:00Z");
  it("allows a sign-in from the last 15 minutes only", () => {
    expect(signedInRecently("2026-11-01T11:50:00Z", now)).toBe(true);
    expect(signedInRecently("2026-11-01T11:44:59Z", now)).toBe(false);
    expect(signedInRecently(null, now)).toBe(false);
  });
});
