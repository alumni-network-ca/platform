"use client";

import { useRouter } from "next/navigation";
import { useLanguage } from "./LanguageProvider";

export function LanguageSwitcher() {
  const {
    locale,
    setLocale,
  } = useLanguage();

  const router = useRouter();

  function changeLanguage(
    language: "en" | "fr"
  ) {
    setLocale(language);

    document.cookie =
      `herzliah-language=${language}; path=/; max-age=31536000; SameSite=Lax`;

    router.refresh();
  }

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
        onClick={() =>
          changeLanguage("en")
        }
        style={{
          border: "none",
          background: "transparent",
          cursor: "pointer",
          color: "white",
          fontWeight:
            locale === "en"
              ? 800
              : 500,
          opacity:
            locale === "en"
              ? 1
              : 0.6,
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
        onClick={() =>
          changeLanguage("fr")
        }
        style={{
          border: "none",
          background: "transparent",
          cursor: "pointer",
          color: "white",
          fontWeight:
            locale === "fr"
              ? 800
              : 500,
          opacity:
            locale === "fr"
              ? 1
              : 0.6,
          padding: 0,
        }}
      >
        FR
      </button>
    </div>
  );
}
