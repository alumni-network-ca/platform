export function periodSince(period: "30d" | "year" | "all", now: Date): string | undefined {
  if (period === "all") return undefined;
  if (period === "30d") return new Date(now.getTime() - 30 * 86400000).toISOString();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "numeric",
  }).formatToParts(now);
  const year = Number(parts.find((p) => p.type === "year")?.value),
    month = Number(parts.find((p) => p.type === "month")?.value);
  // The school year starts September 1 in Montreal (UTC-4 at that date).
  return new Date(Date.UTC(month >= 9 ? year : year - 1, 8, 1, 4)).toISOString();
}
