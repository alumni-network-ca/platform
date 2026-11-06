import { describe, expect, it } from "vitest";
import { rootUrl, schoolUrl, slugFromName, usesTenantSelector, type Origin } from "./address";

const production: Origin = {
  protocol: "https:",
  host: "alumninetwork.ca",
  rootDomain: "alumninetwork.ca",
  isPreview: false,
};
const local: Origin = {
  protocol: "http:",
  host: "herzliah.localhost:3000",
  rootDomain: "localhost",
  isPreview: false,
};
const preview: Origin = {
  protocol: "https:",
  host: "platform-git-x.vercel.app",
  rootDomain: "alumninetwork.ca",
  isPreview: true,
};
// Staging is a Vercel preview deployment too, but on its own root domain with school subdomains.
const staging: Origin = {
  protocol: "https:",
  host: "staging.alumninetwork.ca",
  rootDomain: "staging.alumninetwork.ca",
  isPreview: true,
};

describe("schoolUrl and rootUrl", () => {
  it("swap the school label on a real domain", () => {
    expect(schoolUrl(production, "herzliah", "/join")).toBe(
      "https://herzliah.alumninetwork.ca/join",
    );
    expect(rootUrl(production, "/console")).toBe("https://alumninetwork.ca/console");
  });

  it("keep the local port", () => {
    expect(schoolUrl(local, "test-school")).toBe("http://test-school.localhost:3000/");
    expect(rootUrl(local, "/console/support?school=herzliah")).toBe(
      "http://localhost:3000/console/support?school=herzliah",
    );
  });

  it("stay on the preview host and switch with ?tenant=", () => {
    expect(schoolUrl(preview, "herzliah", "/staff/accept?token=abc")).toBe(
      "https://platform-git-x.vercel.app/staff/accept?token=abc&tenant=herzliah",
    );
    expect(rootUrl(preview, "/console")).toBe(
      "https://platform-git-x.vercel.app/console?tenant=root",
    );
  });

  it("use subdomains on staging, a preview deployment on its own root domain", () => {
    expect(schoolUrl(staging, "maimonide", "/staff/accept?token=abc")).toBe(
      "https://maimonide.staging.alumninetwork.ca/staff/accept?token=abc",
    );
    const school = { ...staging, host: "maimonide.staging.alumninetwork.ca" };
    expect(rootUrl(school, "/console")).toBe("https://staging.alumninetwork.ca/console");
    expect(schoolUrl(school, "herzliah")).toBe("https://herzliah.staging.alumninetwork.ca/");
  });
});

describe("usesTenantSelector", () => {
  it("is true only for a preview host outside the root domain", () => {
    expect(usesTenantSelector(preview)).toBe(true);
    expect(usesTenantSelector(staging)).toBe(false);
    expect(usesTenantSelector({ ...staging, host: "maimonide.staging.alumninetwork.ca:443" })).toBe(
      false,
    );
    expect(usesTenantSelector(production)).toBe(false);
  });
});

describe("slugFromName", () => {
  it.each([
    ["Maple Ridge Academy", "maple-ridge"],
    ["Herzliah High School", "herzliah"],
    ["Collège Jean-de-Brébeuf", "jean-de-brebeuf"],
    ["  St. Paul's  ", "st-paul-s"],
    ["A".repeat(60), "a".repeat(40)],
  ])("%s → %s", (name, slug) => {
    expect(slugFromName(name)).toBe(slug);
  });
});
