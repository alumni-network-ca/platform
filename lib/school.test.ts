import { describe, expect, it } from "vitest";
import { decodeSchool, encodeSchool } from "./school";

describe("the x-school header", () => {
  it("carries the school without its branding, which comes from the cached config", () => {
    const raw = encodeSchool({
      id: "a1",
      name: "Université Herzliah",
      slug: "herzliah",
      default_locale: "fr",
      branding: { short_name: "Herzliah", logo: "/herzliah-logo.png" },
    });
    expect(raw).toMatch(/^[\x20-\x7e]+$/);
    expect(decodeSchool(raw)).toEqual({
      id: "a1",
      name: "Université Herzliah",
      slug: "herzliah",
      default_locale: "fr",
    });
  });

  it("is ignored when missing or not a school", () => {
    expect(decodeSchool(null)).toBeNull();
    expect(decodeSchool(encodeURIComponent(JSON.stringify({ slug: "x" })))).toBeNull();
  });
});
