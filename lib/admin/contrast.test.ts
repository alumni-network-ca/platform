import { expect, it } from "vitest";
import { contrastRatio } from "./contrast";
it("measures contrast including the design colours", () => {
  expect(contrastRatio("#000000")).toBe(21);
  expect(contrastRatio("#FFFFFF")).toBe(1);
  expect(contrastRatio("#0B2159")).toBeGreaterThan(4.5);
  expect(contrastRatio("#7B1E3D")).toBeGreaterThan(4.5);
  expect(contrastRatio("navy")).toBeNull();
});
