import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicSchool } from "@/lib/database";
import { clearSchoolCache, lookupSchool } from "./lookup";

const herzliah: PublicSchool = {
  id: "a1",
  name: "Herzliah High School",
  slug: "herzliah",
  default_locale: "en",
  branding: {},
};

describe("lookupSchool", () => {
  beforeEach(() => clearSchoolCache());

  it("queries once per minute for a known school", async () => {
    const fetchSchool = vi.fn(async () => herzliah);
    expect(await lookupSchool("herzliah", fetchSchool, 0)).toBe(herzliah);
    expect(await lookupSchool("herzliah", fetchSchool, 59_000)).toBe(herzliah);
    expect(fetchSchool).toHaveBeenCalledTimes(1);
    await lookupSchool("herzliah", fetchSchool, 61_000);
    expect(fetchSchool).toHaveBeenCalledTimes(2);
  });

  it("remembers an unknown school for 15 seconds", async () => {
    const fetchSchool = vi.fn(async () => null);
    expect(await lookupSchool("nope", fetchSchool, 0)).toBeNull();
    await lookupSchool("nope", fetchSchool, 14_000);
    expect(fetchSchool).toHaveBeenCalledTimes(1);
    await lookupSchool("nope", fetchSchool, 16_000);
    expect(fetchSchool).toHaveBeenCalledTimes(2);
  });

  it("does not cache a failed lookup", async () => {
    const fetchSchool = vi
      .fn()
      .mockRejectedValueOnce(new Error("down"))
      .mockResolvedValueOnce(herzliah);
    await expect(lookupSchool("herzliah", fetchSchool, 0)).rejects.toThrow("down");
    expect(await lookupSchool("herzliah", fetchSchool, 1)).toBe(herzliah);
  });

  it("keeps at most 500 schools", async () => {
    const fetchSchool = vi.fn(async () => null);
    for (let i = 0; i < 501; i++) await lookupSchool(`school-${i}`, fetchSchool, 0);
    await lookupSchool("school-0", fetchSchool, 0);
    expect(fetchSchool).toHaveBeenCalledTimes(502);
  });
});
