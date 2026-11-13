import { cookies } from "next/headers";
import { LANGUAGE_COOKIE } from "@/config/language";
import { Locale, translations } from "@/lib/i18n";

export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();

  const saved = cookieStore.get(LANGUAGE_COOKIE)?.value;

  if (saved === "fr") {
    return "fr";
  }

  return "en";
}

export async function getServerTranslations() {
  const locale = await getServerLocale();

  return {
    locale,
    t: translations[locale],
  };
}
