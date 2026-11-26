import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAccess } from "@/lib/auth/account";
import { format } from "@/lib/i18n";
import { getServerTranslations } from "@/lib/i18n-server";
import { coverUrls, livePostsQuery, type PostRow } from "@/lib/posts/data";
import { hostOf, monthBounds, monthLabel, SCHOOL_TIME_ZONE, schoolMonth } from "@/lib/posts/posts";
import { schoolBranding } from "@/lib/school";
import { textLink } from "@/components/alumni/parts";
import { MonthNeighbours, PostArticle, PostBody } from "@/components/posts/PostArticle";
import { whenOf } from "@/components/posts/PostTimeline";
import { cn } from "@/lib/utils";

// 3.6 One post (POST-03), as the list's timeline continued: the day column, the post, then the other posts of the
// same month. Only a post alumni may read now; a draft, a scheduled post or another school's post is a 404, as if it
// did not exist.

const NEIGHBOURS = 6;

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { supabase, school } = await requireAccess(`/posts/${id}`);
  const { locale, t: all } = await getServerTranslations();
  const t = all.posts;
  const now = new Date();
  const { data, error } = await livePostsQuery(supabase, school.id, now).eq("id", id).maybeSingle();
  if (error) throw new Error(`Could not load the post: ${error.message}`);
  if (!data) notFound();
  const post = data as PostRow;
  const published = new Date(post.publish_at!);
  const month = schoolMonth(published);
  const [start, end] = monthBounds(month);
  const [covers, { data: others, error: othersError }] = await Promise.all([
    coverUrls(supabase, [post.cover_path]),
    livePostsQuery(supabase, school.id, now)
      .gte("publish_at", start.toISOString())
      .lt("publish_at", end.toISOString())
      .neq("id", post.id)
      .limit(NEIGHBOURS),
  ]);
  if (othersError) throw new Error(`Could not load the month's posts: ${othersError.message}`);
  const cover = post.cover_path ? covers.get(post.cover_path) : null;
  const lang = locale === "fr" ? "fr-CA" : "en-CA";
  const dates = new Intl.DateTimeFormat(lang, { dateStyle: "long", timeZone: SCHOOL_TIME_ZONE });
  const days = new Intl.DateTimeFormat(lang, { day: "numeric", timeZone: SCHOOL_TIME_ZONE });
  const { shortName, networkName } = schoolBranding(school);

  return (
    <main className="mx-auto flex w-full max-w-[880px] flex-col gap-6 px-6 pt-7 pb-14 max-[720px]:px-4">
      <Link href="/posts" className={cn(textLink, "self-start text-base font-semibold")}>
        ← <span className="sr-only">{t.allPosts}: </span>
        {monthLabel(month, lang)}
      </Link>
      <PostArticle
        kind={post.kind}
        tag={post.kind === "news" ? t.news : t.fundraising}
        meta={
          post.kind === "fundraising" && post.ends_on
            ? format(t.until, { date: dates.format(new Date(`${post.ends_on}T12:00:00Z`)) })
            : null
        }
        title={post.title}
        cover={cover}
        when={whenOf(published, lang, SCHOOL_TIME_ZONE)}
        after={
          <MonthNeighbours
            heading={format(t.alsoIn, { month: monthLabel(month, lang, { heading: false }) })}
            posts={((others ?? []) as PostRow[]).map((other) => ({
              id: other.id,
              href: `/posts/${other.id}`,
              day: days.format(new Date(other.publish_at!)),
              title: other.title,
              kind: other.kind,
            }))}
          />
        }
      >
        <PostBody
          post={post}
          outboundHref={`/posts/${post.id}/go`}
          t={{
            goal: post.goal_note ? format(t.goal, { goal: post.goal_note }) : null,
            leaveNote: format(t.leaveNote, { network: networkName, school: shortName }),
            give: format(t.give, { host: hostOf(post.external_url ?? "") }),
            newTab: t.newTab,
          }}
        />
      </PostArticle>
    </main>
  );
}
