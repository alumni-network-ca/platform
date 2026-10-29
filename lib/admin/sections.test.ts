import { describe, expect, it } from "vitest";
import { adminSections } from "./sections";
describe("school console navigation", () => {
  it("shows seven admin sections in canvas order", () => {
    expect(adminSections(() => true, 3).map((s) => s.key)).toEqual([
      "dashboard",
      "approvals",
      "alumni",
      "templates",
      "staff",
      "audit",
      "settings",
    ]);
  });
  it("shows four reviewer sections and the badge", () => {
    const read = new Set(["metrics.read", "requests.read", "records.read", "audit.read"]);
    const sections = adminSections((key) => read.has(key), 7);
    expect(sections.map((s) => s.key)).toEqual(["dashboard", "approvals", "alumni", "audit"]);
    expect(sections[1]?.badge).toBe(7);
  });
  it("gives alumni no sections", () => expect(adminSections(() => false, 9)).toEqual([]));
});
