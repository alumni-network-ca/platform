import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/lib/admin/contrast";
import { BAR_HIGHLIGHT, DEFAULT_ACCENT, DEFAULT_PRIMARY, mix, schoolTheme } from "./theme";

const vars = (branding: Record<string, string>) =>
  schoolTheme(branding) as Record<string, string> | undefined;
const ratio = (a: string, b: string) => contrastRatio(a, b) ?? 0;

describe("school colours", () => {
  it("leave the default theme alone when a school keeps Herzliah's colours or sets none", () => {
    expect(schoolTheme(undefined)).toBeUndefined();
    expect(schoolTheme(null)).toBeUndefined();
    expect(schoolTheme({ short_name: "Herzliah", logo: "/herzliah-logo.png" })).toBeUndefined();
    expect(
      vars({ primary_color: DEFAULT_PRIMARY.toLowerCase(), accent_color: DEFAULT_ACCENT }),
    ).toBeUndefined();
  });

  it("ignore values that are not hex colours", () => {
    expect(vars({ primary_color: "navy", accent_color: "#12345" })).toBeUndefined();
    expect(vars({ primary_color: "url(x)", accent_color: "#21bbed" })?.["--brand"]).toBeUndefined();
  });

  it("keep a school's colours where they are readable: Maimonide's blue carries white text", () => {
    const v = vars({ primary_color: "#0D51A1", accent_color: "#21BBED" })!;
    expect(v["--brand"]).toBe("#0D51A1");
    // Its sky blue is 2.2:1 on white, so text and buttons use a darker shade of it; tints keep the bright hue.
    expect(ratio("#21BBED", "#FFFFFF")).toBeLessThan(3);
    expect(v["--accent"]).not.toBe("#21BBED");
    expect(v["--accent-soft"]).toBe(mix("#21BBED", "#FFFFFF", 0.87));
  });

  // Every pair that globals.css draws, for colours that are too light, too dark or the defaults' opposites.
  for (const [primary, accent] of [
    ["#0D51A1", "#21BBED"],
    ["#FFFF00", "#FFFFFF"],
    ["#000000", "#000000"],
    ["#2E8B57", "#F4A300"],
    ["#C8102E", "#7FD1E8"],
  ]) {
    it(`meet WCAG AA contrast for primary ${primary} and accent ${accent}`, () => {
      const v = vars({ primary_color: primary!, accent_color: accent! })!;
      // White text on the bar, also on its active link and open menu highlights.
      expect(ratio(mix(v["--brand"]!, "#FFFFFF", BAR_HIGHLIGHT), "#FFFFFF")).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(ratio(v["--ink"]!, "#F7F7F6")).toBeGreaterThanOrEqual(12);
      for (const text of [
        "--on-brand-soft",
        "--on-brand-muted",
        "--on-brand-faint",
        "--on-brand-accent",
      ])
        expect(ratio(v[text]!, v["--brand"]!), text).toBeGreaterThanOrEqual(4.5);
      expect(ratio(v["--on-brand-line"]!, v["--brand"]!)).toBeGreaterThanOrEqual(3);
      for (const text of ["--on-deep-soft", "--on-deep-muted"])
        expect(ratio(v[text]!, v["--brand-deep"]!), text).toBeGreaterThanOrEqual(4.5);
      for (const surface of ["#FFFFFF", "#F7F7F6", v["--accent-soft"]!, v["--accent-pale"]!])
        expect(ratio(v["--accent"]!, surface), surface).toBeGreaterThanOrEqual(4.5);
      expect(ratio(v["--accent-dark"]!, v["--accent-soft"]!)).toBeGreaterThanOrEqual(4.5);
      expect(ratio(v["--accent-ring"]!, "#FFFFFF")).toBeGreaterThanOrEqual(3);
      // Ink on the accent's tints (chips, selected options).
      for (const tint of ["--accent-soft", "--accent-pale", "--accent-chip"])
        expect(ratio(v["--ink"]!, v[tint]!), tint).toBeGreaterThanOrEqual(4.5);
    });
  }

  it("change only the family a school set", () => {
    const accentOnly = vars({ accent_color: "#21BBED" })!;
    expect(accentOnly["--brand"]).toBeUndefined();
    expect(accentOnly["--accent"]).toBeDefined();
    const primaryOnly = vars({ primary_color: "#0D51A1" })!;
    expect(primaryOnly["--accent"]).toBeUndefined();
    expect(ratio(primaryOnly["--on-brand-accent"]!, "#0D51A1")).toBeGreaterThanOrEqual(4.5);
  });
});
