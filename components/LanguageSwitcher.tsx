"use client";

import { useLanguage } from "./LanguageProvider";

export function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontSize: 13,
        fontWeight: 700,
        color: "white",
      }}
    >
      <button
        type="button"
        onClick={() => setLocale("en")}
        style={{
          border: "none",
          background: "transparent",
          cursor: "pointer",
          color: "white",
          fontWeight: locale === "en" ? 800 : 500,
          opacity: locale === "en" ? 1 : 0.6,
          padding: 0,
        }}
      >
        EN
      </button>

      <span
        style={{
          color: "white",
          opacity: 0.5,
        }}
      >
        |
      </span>

      <button
        type="button"
        onClick={() => setLocale("fr")}
        style={{
          border: "none",
          background: "transparent",
          cursor: "pointer",
          color: "white",
          fontWeight: locale === "fr" ? 800 : 500,
          opacity: locale === "fr" ? 1 : 0.6,
          padding: 0,
        }}
      >
        FR
      </button>
    </div>
  );
}
