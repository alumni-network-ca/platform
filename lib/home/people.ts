// What the alumni home page (DIR-06) shows of other people. Pure, so the picks are unit-tested; the page reads
// the rows through RLS (search_directory, contact_events) and only shapes them here.

/** How many people each card of the home page shows. */
export const SHOWN = 3;

type Person = { id: string };

/** The first `count` rows that are not the reader's own profile (search_directory includes it when published). */
export function others<T extends Person>(rows: readonly T[], me: string, count = SHOWN): T[] {
  return rows.filter((row) => row.id !== me).slice(0, count);
}

/** Classmates other than the reader: the class total minus their own profile when it is listed. */
export function classmateCount(total: number, meListed: boolean): number {
  return Math.max(0, total - (meListed ? 1 : 0));
}

export type ContactEvent = { recipient_profile_id: string; channel: string; created_at: string };

/** The latest contact with each person, newest first: one row per person however often they were contacted. */
export function latestContacts(events: readonly ContactEvent[], count = 5): ContactEvent[] {
  const seen = new Set<string>();
  return [...events]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .filter((event) => {
      if (seen.has(event.recipient_profile_id)) return false;
      seen.add(event.recipient_profile_id);
      return true;
    })
    .slice(0, count);
}

/** The name an alumnus goes by: their preferred first name when they gave one. */
export const displayName = (p: {
  first_name: string;
  last_name: string;
  preferred_name?: string | null;
}) => `${p.preferred_name || p.first_name} ${p.last_name}`;

/** Whether the yearly "still accurate?" question is due. A profile with no due date is not asked yet. */
export const confirmationDue = (dueAt: string | null, now: Date) =>
  dueAt !== null && Date.parse(dueAt) <= now.getTime();
