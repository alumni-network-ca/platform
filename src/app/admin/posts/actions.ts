"use server";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth/staff";
import { field } from "@/lib/admin/forms";
import { sendQueuedEmails } from "@/lib/email/send";
import {
  POST_LIMITS,
  isHttpsUrl,
  schoolTimeToDate,
  schoolToday,
  type PostKind,
} from "@/lib/posts/posts";
import { docText, excerpt, normalizeDoc } from "@/lib/posts/richtext";

// School posts, admin side (POST-02, POST-04). Every write goes through the RPCs, which check posts.manage and
// audit; the checks here only turn a bad form into a clear message before the database refuses it.

export type PostFormError =
  | "title"
  | "body"
  | "description"
  | "link"
  | "goal"
  | "endDate"
  | "schedule"
  | "ended"
  | "forbidden"
  | "failed";
export type PostOutcome = "draft" | "saved" | "published" | "scheduled";
export type PostFormState = { error: PostFormError | null };

const fail = (error: PostFormError): PostFormState => ({ error });
const fromDatabase = (error: { code?: string; message?: string }): PostFormState => {
  if (error.code === "42501") return fail("forbidden");
  if (error.message?.includes("end date")) return fail("ended");
  if (error.message?.includes("a year ahead")) return fail("schedule");
  if (error.code === "23514" && error.message?.includes("external_url")) return fail("link");
  return fail("failed");
};

export async function savePost(_: PostFormState, form: FormData): Promise<PostFormState> {
  const { supabase, school } = await requireStaff("/admin/posts", "posts.manage");
  const now = new Date();
  const id = field(form, "id") || null;
  const kind = field(form, "kind") as PostKind;
  if (kind !== "news" && kind !== "fundraising") return fail("failed");

  const title = field(form, "title");
  if (!title || title.length > POST_LIMITS.title) return fail("title");

  let body = null;
  let summary: string;
  let url = "";
  let goal = "";
  let endsOn: string | null = null;
  if (kind === "news") {
    let raw: unknown = null;
    try {
      raw = JSON.parse(String(form.get("body") ?? "") || "null");
    } catch {
      return fail("body");
    }
    body = normalizeDoc(raw);
    const text = docText(body);
    if (!text) return fail("body");
    summary = excerpt(text);
  } else {
    summary = field(form, "summary");
    if (!summary || summary.length > POST_LIMITS.summary) return fail("description");
    url = field(form, "external_url");
    if (!isHttpsUrl(url)) return fail("link");
    goal = field(form, "goal_note");
    if (goal.length > POST_LIMITS.goalNote) return fail("goal");
    endsOn = field(form, "ends_on") || null;
    if (endsOn && !/^\d{4}-\d{2}-\d{2}$/.test(endsOn)) return fail("endDate");
  }

  const when = field(form, "when");
  const notify = form.get("notify") === "on";
  let at: Date | null = null;
  if (when === "schedule") {
    at = schoolTimeToDate(field(form, "publish_at"));
    if (!at || at <= now) return fail("schedule");
  }
  if ((when === "now" || when === "schedule") && endsOn && endsOn < schoolToday(now))
    return fail("ended");

  const current = id
    ? (
        await supabase
          .from("school_posts")
          .select("status, publish_at, notified_at")
          .eq("id", id)
          .eq("institution_id", school.id)
          .maybeSingle()
      ).data
    : null;
  if (id && !current) notFound();

  const { data: saved, error } = await supabase.rpc("save_post", {
    p_inst: school.id,
    p_post: id ?? undefined,
    p_kind: kind,
    p_title: title,
    p_body: body ?? undefined,
    p_summary: summary,
    p_external_url: url || undefined,
    p_goal_note: goal || undefined,
    p_ends_on: endsOn ?? undefined,
    p_cover_path: field(form, "cover_path") || undefined,
  });
  if (error || !saved) return fromDatabase(error ?? {});

  let outcome: PostOutcome = current?.status === "published" ? "saved" : "draft";
  // Publishing now or at a time; or, for a post that is already published or scheduled, notifying alumni later
  // without moving its date.
  const publishAt =
    when === "schedule"
      ? at!.toISOString()
      : when === "now"
        ? undefined
        : notify && current?.status === "published" && !current.notified_at
          ? (current.publish_at ?? undefined)
          : null;
  if (publishAt !== null) {
    const { error: publishError } = await supabase.rpc("publish_post", {
      p_post: saved,
      p_publish_at: publishAt,
      p_notify: notify,
    });
    if (publishError) return fromDatabase(publishError);
    if (when === "now") outcome = "published";
    if (when === "schedule") outcome = "scheduled";
    // The emails of a post that is live now go out after the response; scheduled ones wait for the cron sweep.
    if (notify) await sendQueuedEmails(saved);
  }

  // The nav bar shows "Posts" only while the school has a live post.
  revalidatePath("/", "layout");
  // Back to the post's page, with the outcome in the address: the form starts fresh for the post's new state.
  redirect(`/admin/posts/${saved}?saved=${outcome}`);
}

async function change(
  form: FormData,
  rpc: "unpublish_post" | "archive_post" | "delete_post",
  done: string,
) {
  const { supabase } = await requireStaff("/admin/posts", "posts.manage");
  const id = field(form, "id");
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { error } = await supabase.rpc(rpc, { p_post: id });
  if (error)
    redirect(`/admin/posts/${id}?error=${error.code === "42501" ? "forbidden" : "failed"}`);
  revalidatePath("/", "layout");
  redirect(done.replace("{id}", id));
}

export async function unpublishPost(form: FormData) {
  await change(form, "unpublish_post", "/admin/posts/{id}?saved=unpublished");
}
export async function archivePost(form: FormData) {
  await change(form, "archive_post", "/admin/posts/{id}?saved=archived");
}
export async function deletePost(form: FormData) {
  await change(form, "delete_post", "/admin/posts?saved=deleted");
}
