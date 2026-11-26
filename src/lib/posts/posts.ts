// School posts (POST-01..POST-03; docs/design/school-posts.md): the rules the pages share. Pure, so they are
// unit-tested; the database enforces the same rules (school_posts' constraints and read policy).
import type { Enums, Tables } from "@/lib/database";

export type PostKind = Enums<"post_kind">;
export type Post = Tables<"school_posts">;

/** Every school is in Quebec or Ontario today: dates and schedules are read in this zone (school_today()). */
export const SCHOOL_TIME_ZONE = "America/Toronto";

export const POST_LIMITS = {
  title: 160,
  summary: 500,
  goalNote: 120,
  url: 2000,
  /** Bytes; the storage bucket refuses anything larger too. */
  cover: 5 * 1024 * 1024,
} as const;

/** Cover image types: the bucket's allowed_mime_types, and the file extension each is stored under. */
export const COVER_TYPES: Record<string, "jpg" | "png" | "webp"> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
export const COVER_BUCKET = "post-covers";

// The database's check on school_posts.external_url, character for character.
const HTTPS_URL =
  /^https:\/\/[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)+(:[0-9]{1,5})?([/?#][^\s<>"]*)?$/;

/** A fundraising link alumni may be sent to: https, a host name, no credentials (POST-01). */
export const isHttpsUrl = (value: string) =>
  value.length <= POST_LIMITS.url && HTTPS_URL.test(value);

/** "give.herzliah.ca": the host alumni see on the outbound button before they leave. */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export type PostState = "draft" | "scheduled" | "published" | "ended" | "archived";

/** Today's date in the schools' zone, as YYYY-MM-DD. */
export function schoolToday(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: SCHOOL_TIME_ZONE }).format(now);
}

/** Where a post stands, as the admin list shows it. "Scheduled" is a published post that is not live yet. */
export function postState(
  post: Pick<Post, "status" | "publish_at" | "ends_on">,
  now: Date,
): PostState {
  if (post.status === "archived") return "archived";
  if (post.status === "draft" || !post.publish_at) return "draft";
  if (new Date(post.publish_at) > now) return "scheduled";
  if (post.ends_on && post.ends_on < schoolToday(now)) return "ended";
  return "published";
}

/** Whether alumni see the post now: the same test as the read policy on school_posts. */
export const isLive = (post: Pick<Post, "status" | "publish_at" | "ends_on">, now: Date) =>
  postState(post, now) === "published";

/**
 * A "YYYY-MM-DDTHH:mm" wall-clock time in the schools' zone (a datetime-local field) as an instant, or null when
 * the text is not such a time. Daylight saving is handled by asking Intl for the zone's offset at that moment.
 */
export function schoolTimeToDate(local: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!match) return null;
  const [y, mo, d, h, mi] = match.slice(1).map(Number) as [number, number, number, number, number];
  const asUtc = Date.UTC(y, mo - 1, d, h, mi);
  if (Number.isNaN(asUtc) || new Date(asUtc).getUTCDate() !== d) return null;
  const offsetAt = (instant: number) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: SCHOOL_TIME_ZONE,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(new Date(instant));
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    return (
      Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute")) - instant
    );
  };
  // Two passes settle the offset across a daylight-saving change.
  let instant = asUtc - offsetAt(asUtc);
  instant = asUtc - offsetAt(instant);
  return new Date(instant);
}

/** An instant as the "YYYY-MM-DDTHH:mm" a datetime-local field shows, in the schools' zone. */
export function toSchoolTime(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SCHOOL_TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** "2026-11": the month a post went live, in the schools' zone. The list (3.5) groups posts under these. */
export function schoolMonth(instant: Date): string {
  return schoolToday(instant).slice(0, 7);
}

/** Posts in the order given (newest first), with each run of posts from one month under that month. */
export function groupByMonth<T extends { publish_at: string | null }>(
  posts: T[],
): { month: string; posts: T[] }[] {
  const groups: { month: string; posts: T[] }[] = [];
  for (const post of posts) {
    if (!post.publish_at) continue;
    const month = schoolMonth(new Date(post.publish_at));
    const last = groups.at(-1);
    if (last?.month === month) last.posts.push(post);
    else groups.push({ month, posts: [post] });
  }
  return groups;
}

/**
 * "November 2026" / "Novembre 2026": a "YYYY-MM" month as a heading, capitalised in either language. Inside a
 * sentence pass `heading: false`, so French keeps its lower-case month ("Aussi en novembre 2026").
 */
export function monthLabel(month: string, lang: string, { heading = true } = {}): string {
  const label = new Intl.DateTimeFormat(lang, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-15T12:00:00Z`));
  return heading ? label.charAt(0).toLocaleUpperCase(lang) + label.slice(1) : label;
}

/** The instants a "YYYY-MM" month starts and ends at in the schools' zone: [start, end). */
export function monthBounds(month: string): [Date, Date] {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  return [schoolTimeToDate(`${month}-01T00:00`)!, schoolTimeToDate(`${next}-01T00:00`)!];
}
