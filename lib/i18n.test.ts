import { describe, expect, it } from "vitest";
import { format, getTranslations, translations } from "./i18n";

function keyPaths(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    keyPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("translations", () => {
  it("has the same keys in English and French", () => {
    expect(keyPaths(translations.fr).sort()).toEqual(keyPaths(translations.en).sort());
  });

  it("has no empty strings", () => {
    for (const locale of ["en", "fr"] as const) {
      const empty = keyPaths(translations[locale]).filter((path) => {
        const value = path
          .split(".")
          .reduce<unknown>(
            (node, key) => (node as Record<string, unknown>)[key],
            translations[locale],
          );
        return typeof value === "string" && value.trim() === "";
      });
      expect(empty, `empty ${locale} strings`).toEqual([]);
    }
  });

  it("uses the same {placeholders} in both languages", () => {
    const placeholders = (locale: "en" | "fr") =>
      Object.fromEntries(
        Object.entries(translations[locale].nav).map(([key, text]) => [
          key,
          [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort(),
        ]),
      );
    expect(placeholders("fr")).toEqual(placeholders("en"));
  });

  it("returns the requested locale", () => {
    expect(getTranslations("fr")).toBe(translations.fr);
    expect(getTranslations("en")).toBe(translations.en);
  });
});

describe("format", () => {
  it("fills each placeholder and leaves unknown ones as they are", () => {
    expect(format("Class of {year} · {school}", { year: 2014, school: "Herzliah" })).toBe(
      "Class of 2014 · Herzliah",
    );
    expect(format("{count} {unknown}", { count: 3 })).toBe("3 {unknown}");
  });
});
