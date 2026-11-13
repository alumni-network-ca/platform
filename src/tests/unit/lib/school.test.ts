import { describe, expect, it } from "vitest";
import { decodeSchool, encodeSchool, schoolBranding, type PublicSchool } from "@/lib/school";

const school = (branding: PublicSchool["branding"]): PublicSchool => ({
  id: "a1",
  name: "Herzliah High School",
  slug: "herzliah",
  default_locale: "en",
  branding,
});

describe("schoolBranding", () => {
  it("reads the names, logo and tab icon a school set", () => {
    expect(
      schoolBranding(
        school({
          short_name: " Herzliah ",
          logo: "/herzliah-logo.png",
          favicon: "/institutes/favicons/herzliah.png",
        }),
      ),
    ).toEqual({
      shortName: "Herzliah",
      networkName: "Herzliah Alumni Network",
      logo: "/herzliah-logo.png",
      favicon: "/institutes/favicons/herzliah.png",
    });
  });

  it("falls back to the full name and no images when nothing is set", () => {
    expect(schoolBranding(school(null))).toEqual({
      shortName: "Herzliah High School",
      networkName: "Herzliah High School Alumni Network",
      logo: null,
      favicon: null,
    });
  });

  it("loads images from this site only", () => {
    const { logo, favicon } = schoolBranding(
      school({ logo: "https://cdn.example/logo.png", favicon: "//elsewhere.example/icon.png" }),
    );
    expect(logo).toBeNull();
    expect(favicon).toBeNull();
  });
});

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
