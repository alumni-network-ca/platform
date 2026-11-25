import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database";
import { COVER_BUCKET, schoolToday, type Post } from "./posts";

// Reads for the school posts pages (POST-02, POST-03). Every read runs as the signed-in person, through RLS:
// alumni get published, live posts only whatever these filters say; the filters keep staff, who may read drafts
// too, to what alumni see.

type Client = SupabaseClient<Database>;

export const POST_COLUMNS =
  "id, institution_id, kind, title, body, summary, external_url, goal_note, ends_on, cover_path, status, publish_at, notified_at, created_at, updated_at";

export type PostRow = Pick<
  Post,
  | "id"
  | "institution_id"
  | "kind"
  | "title"
  | "body"
  | "summary"
  | "external_url"
  | "goal_note"
  | "ends_on"
  | "cover_path"
  | "status"
  | "publish_at"
  | "notified_at"
  | "created_at"
  | "updated_at"
>;

/** The posts alumni see now at a school, newest first; optionally one kind only. */
export function livePostsQuery(supabase: Client, schoolId: string, now: Date, kind?: Post["kind"]) {
  let query = supabase
    .from("school_posts")
    .select(POST_COLUMNS, { count: "exact" })
    .eq("institution_id", schoolId)
    .eq("status", "published")
    .lte("publish_at", now.toISOString())
    .or(`ends_on.is.null,ends_on.gte.${schoolToday(now)}`)
    .order("publish_at", { ascending: false });
  if (kind) query = query.eq("kind", kind);
  return query;
}

/** How many live posts of each kind a school has: the nav entry and the filter chips appear only when there are. */
export async function liveKinds(
  supabase: Client,
  schoolId: string,
  now: Date,
): Promise<{ news: number; fundraising: number }> {
  const { data, error } = await supabase
    .from("school_posts")
    .select("kind")
    .eq("institution_id", schoolId)
    .eq("status", "published")
    .lte("publish_at", now.toISOString())
    .or(`ends_on.is.null,ends_on.gte.${schoolToday(now)}`)
    .limit(1000);
  if (error) throw new Error(`Could not load the school posts: ${error.message}`);
  return {
    news: (data ?? []).filter((p) => p.kind === "news").length,
    fundraising: (data ?? []).filter((p) => p.kind === "fundraising").length,
  };
}

/**
 * Short-lived addresses for cover images. The bucket is private: the storage policy lets a reader fetch only the
 * cover of a post they may read, so a cover never leaks through a guessed path.
 */
export async function coverUrls(
  supabase: Client,
  paths: (string | null)[],
): Promise<Map<string, string>> {
  const wanted = [...new Set(paths.filter((p): p is string => !!p))];
  if (!wanted.length) return new Map();
  const { data, error } = await supabase.storage.from(COVER_BUCKET).createSignedUrls(wanted, 3600);
  // A missing cover is not worth failing the page for: the card shows without it.
  if (error || !data) return new Map();
  return new Map(
    data.flatMap((d) => (d.path && d.signedUrl && !d.error ? [[d.path, d.signedUrl]] : [])),
  );
}
