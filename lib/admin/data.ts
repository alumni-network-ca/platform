import "server-only";
import { translations } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n-server";
export async function adminCopy() {
  const locale = await getServerLocale();
  return { locale, t: translations[locale].admin };
}
export async function read<T>(
  query: PromiseLike<{ data: T; error: { message: string } | null }>,
): Promise<NonNullable<T>> {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  if (data === null) throw new Error("School console query returned no data");
  return data as NonNullable<T>;
}
export const pageNumber = (value?: string) =>
  Math.min(100000, Math.max(1, Number.isSafeInteger(Number(value)) ? Number(value) : 1));
export const dateLabel = (date: string | null, locale: string) =>
  date
    ? new Intl.DateTimeFormat(locale === "fr" ? "fr-CA" : "en-CA", {
        dateStyle: "medium",
        timeZone: "America/Toronto",
      }).format(new Date(date))
    : "—";
export type Search = Promise<Record<string, string | undefined>>;
