import { describe, expect, it } from "vitest";
import { getTranslations, translations } from "./i18n";

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

  it("returns the requested locale", () => {
    expect(getTranslations("fr")).toBe(translations.fr);
    expect(getTranslations("en")).toBe(translations.en);
  });
});
