import { describe, expect, it } from "vitest";
import { nextHidden } from "./useHideOnScroll";

describe("nextHidden", () => {
  const bar = 66;

  it("hides when scrolling down past the bar", () => {
    expect(nextHidden(100, 160, false, bar)).toBe(true);
  });

  it("keeps showing while still within the bar's own height", () => {
    expect(nextHidden(10, 40, false, bar)).toBe(false);
  });

  it("shows again on any real upward scroll", () => {
    expect(nextHidden(400, 380, true, bar)).toBe(false);
  });

  it("ignores jitter in either direction", () => {
    expect(nextHidden(400, 404, true, bar)).toBe(true);
    expect(nextHidden(400, 396, false, bar)).toBe(false);
  });

  it("always shows at the top of the page, including overscroll", () => {
    expect(nextHidden(50, 0, true, bar)).toBe(false);
    expect(nextHidden(0, -30, true, bar)).toBe(false);
  });
});
