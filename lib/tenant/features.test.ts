import { describe, expect, it } from "vitest";
import { FEATURES, hasFeature } from "./features";

describe("hasFeature", () => {
  it("is on only when the school's config says true", () => {
    expect(hasFeature({ features: { yeshiva_seminary: true } }, "yeshiva_seminary")).toBe(true);
    expect(hasFeature({ features: { yeshiva_seminary: false } }, "yeshiva_seminary")).toBe(false);
    expect(hasFeature({ features: {} }, "yeshiva_seminary")).toBe(false);
  });

  it("treats a config cached before features existed as all off", () => {
    expect(hasFeature({} as never, "yeshiva_seminary")).toBe(false);
  });

  it("lists every feature once for the console", () => {
    expect(new Set(FEATURES).size).toBe(FEATURES.length);
  });
});
