"use client";

import { useLanguage } from "./LanguageProvider";

export function LanguageSwitcher() {
  const {
    locale,
    setLocale,
  } = useLanguage();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontSize: 13,
        fontWeight: 700,
      }}
    >
      <button
        type="button"
        onClick={() =>
          setLocale("en")
        }
        style={{
          border: "none",
          background: "transparent",
          cursor: "pointer",
          fontWeight:
            locale === "en"
              ? 800
              : 500,
          opacity:
            locale === "en"
              ? 1
              : 0.55,
        }}
      >
        EN
      </button>

      <span
        style={{
          opacity: 0.4,
        }}
      >
        |
      </span>

      <button
        type="button"
        onClick={() =>
          setLocale("fr")
        }
        style={{
          border: "none",
          background: "transparent",
          cursor: "pointer",
          fontWeight:
            locale === "fr"
              ? 800
              : 500,
          opacity:
            locale === "fr"
              ? 1
              : 0.55,
        }}
      >
        FR
      </button>
    </div>
  );
}
