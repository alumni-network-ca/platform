"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

import {
  Locale,
  translations,
} from "@/lib/i18n";

type TranslationSet =
  | typeof translations.en
  | typeof translations.fr;

type LanguageContextType = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslationSet;
};

const LanguageContext =
  createContext<LanguageContextType | null>(null);

export function LanguageProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [locale, setLocaleState] =
    useState<Locale>("en");

  useEffect(() => {
    const saved =
      localStorage.getItem(
        "herzliah-language"
      ) as Locale | null;

    if (saved === "en" || saved === "fr") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- replaced by next-intl in FND-03 (#89)
      setLocaleState(saved);
    }
  }, []);

  function setLocale(newLocale: Locale) {
    setLocaleState(newLocale);

    localStorage.setItem(
      "herzliah-language",
      newLocale
    );

    document.cookie =
      `herzliah-language=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
  }

  return (
    <LanguageContext.Provider
      value={{
        locale,
        setLocale,
        t: translations[locale],
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context =
    useContext(LanguageContext);

  if (!context) {
    throw new Error(
      "useLanguage must be used inside LanguageProvider"
    );
  }

  return context;
}
