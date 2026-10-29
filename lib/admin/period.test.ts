import { expect, it } from "vitest";
import { periodSince } from "./period";
it("uses rolling 30 days, the Montreal school year, or all time", () => {
  const now = new Date("2026-10-29T12:00:00Z");
  expect(periodSince("30d", now)).toBe("2026-09-29T12:00:00.000Z");
  expect(periodSince("year", now)).toBe("2026-09-01T04:00:00.000Z");
  expect(periodSince("all", now)).toBeUndefined();
});
it("does not move to the new school year until midnight in Montreal", () => {
  expect(periodSince("year", new Date("2026-09-01T03:59:00Z"))).toBe("2025-09-01T04:00:00.000Z");
  expect(periodSince("year", new Date("2026-09-01T04:00:00Z"))).toBe("2026-09-01T04:00:00.000Z");
});
