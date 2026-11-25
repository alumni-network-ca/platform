import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/staff";
import { getServerTranslations } from "@/lib/i18n-server";
import { coverUrls, POST_COLUMNS, type PostRow } from "@/lib/posts/data";
import { postState, SCHOOL_TIME_ZONE, toSchoolTime } from "@/lib/posts/posts";
import { ui } from "@/components/admin/parts";
import { KindTag } from "@/components/posts/PostCards";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { PostForm } from "../PostForm";
import { PostStatusActions } from "../PostStatusActions";

// A7.2 / A7.3 for an existing post, with its status and the unpublish, archive and delete actions.
export default async function EditPost({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { supabase, school } = await requireStaff("/admin/posts", "posts.manage");
  const [{ id }, p, { locale, t: all }] = await Promise.all([
    params,
    searchParams,
    getServerTranslations(),
  ]);
  const t = all.posts;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { data, error } = await supabase
    .from("school_posts")
    .select(POST_COLUMNS)
    .eq("id", id)
    .eq("institution_id", school.id)
    .maybeSingle();
  if (error) throw new Error(`Could not load the post: ${error.message}`);
  if (!data) notFound();
  const post = data as PostRow;
  const now = new Date();
  const state = postState(post, now);
  const covers = await coverUrls(supabase, [post.cover_path]);
  const dateTimes = new Intl.DateTimeFormat(locale === "fr" ? "fr-CA" : "en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: SCHOOL_TIME_ZONE,
  });
  const publishAt = post.publish_at ? new Date(post.publish_at) : null;
  const saved = ["draft", "saved", "published", "scheduled", "unpublished", "archived"].find(
    (key) => key === p.saved,
  ) as keyof typeof t.outcomes | undefined;

  return (
    <>
      <Link href="/admin/posts" className={ui.backLink}>
        ← {t.allPosts}
      </Link>
      <div className={ui.shellTitle}>
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <KindTag kind={post.kind} label={post.kind === "news" ? t.news : t.fundraising} />
            <h1>{post.kind === "news" ? t.editNews : t.editFundraising}</h1>
            <Badge
              variant={
                state === "published" ? "success" : state === "scheduled" ? "warning" : "neutral"
              }
            >
              {t.states[state]}
            </Badge>
          </div>
        </div>
        <PostStatusActions id={post.id} state={state} t={t} />
      </div>
      {saved && (
        <Alert variant="success" role="status">
          {t.outcomes[saved]}
        </Alert>
      )}
      {(p.error === "forbidden" || p.error === "failed") && (
        <Alert variant="error" role="alert">
          {t.errors[p.error]}
        </Alert>
      )}
      <PostForm
        // A fresh form after a status change, so the publishing choices match the new state.
        key={`${post.status}-${post.publish_at}-${post.notified_at}`}
        schoolId={school.id}
        t={t}
        values={{
          id: post.id,
          kind: post.kind,
          title: post.title,
          body: post.body,
          summary: post.kind === "fundraising" ? (post.summary ?? "") : "",
          externalUrl: post.external_url ?? "",
          goalNote: post.goal_note ?? "",
          endsOn: post.ends_on ?? "",
          coverPath: post.cover_path,
          coverUrl: post.cover_path ? (covers.get(post.cover_path) ?? null) : null,
          state,
          publishAt: toSchoolTime(
            publishAt && publishAt > now ? publishAt : new Date(now.getTime() + 24 * 3600 * 1000),
          ),
          publishLabel: publishAt ? dateTimes.format(publishAt) : null,
          notifiedLabel: post.notified_at ? dateTimes.format(new Date(post.notified_at)) : null,
        }}
      />
    </>
  );
}
