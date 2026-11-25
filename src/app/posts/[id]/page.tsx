import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAccess } from "@/lib/auth/account";
import { format } from "@/lib/i18n";
import { getServerTranslations } from "@/lib/i18n-server";
import { coverUrls, livePostsQuery, type PostRow } from "@/lib/posts/data";
import { hostOf, SCHOOL_TIME_ZONE } from "@/lib/posts/posts";
import { schoolBranding } from "@/lib/school";
import { textLink } from "@/components/alumni/parts";
import { PostArticle } from "@/components/posts/PostArticle";
import { FundraisingCard } from "@/components/posts/PostCards";
import { cn } from "@/lib/utils";

// 3.6 One post (POST-03): a news article in full, or a fundraising card on its own. Only a post alumni may read
// now; a draft, a scheduled post or another school's post is a 404, as if it did not exist.
export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { supabase, school } = await requireAccess(`/posts/${id}`);
  const { locale, t: all } = await getServerTranslations();
  const t = all.posts;
  const { data, error } = await livePostsQuery(supabase, school.id, new Date())
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Could not load the post: ${error.message}`);
  if (!data) notFound();
  const post = data as PostRow;
  const covers = await coverUrls(supabase, [post.cover_path]);
  const cover = post.cover_path ? covers.get(post.cover_path) : null;
  const dates = new Intl.DateTimeFormat(locale === "fr" ? "fr-CA" : "en-CA", {
    dateStyle: "long",
    timeZone: SCHOOL_TIME_ZONE,
  });
  const { shortName, networkName } = schoolBranding(school);

  return (
    <main className="mx-auto flex w-full max-w-[760px] flex-col gap-4.5 px-6 pt-7 pb-14 max-[720px]:px-4">
      <Link href="/posts" className={cn(textLink, "self-start text-base font-semibold")}>
        ← {t.allPosts}
      </Link>
      {post.kind === "news" ? (
        <PostArticle
          post={post}
          cover={cover}
          date={dates.format(new Date(post.publish_at!))}
          t={t}
        />
      ) : (
        <FundraisingCard
          headingLevel={1}
          title={post.title}
          description={post.summary}
          goal={post.goal_note ? format(t.goal, { goal: post.goal_note }) : null}
          until={
            post.ends_on
              ? format(t.until, { date: dates.format(new Date(`${post.ends_on}T12:00:00Z`)) })
              : null
          }
          cover={cover}
          outboundHref={`/posts/${post.id}/go`}
          t={{
            fundraising: t.fundraising,
            leaveNote: format(t.leaveNote, { network: networkName, school: shortName }),
            give: format(t.give, { host: hostOf(post.external_url ?? "") }),
            newTab: t.newTab,
          }}
        />
      )}
    </main>
  );
}
