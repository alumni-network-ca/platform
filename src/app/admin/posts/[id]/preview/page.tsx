import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/staff";
import { format } from "@/lib/i18n";
import { getServerTranslations } from "@/lib/i18n-server";
import { coverUrls, POST_COLUMNS, type PostRow } from "@/lib/posts/data";
import { hostOf, monthLabel, SCHOOL_TIME_ZONE, schoolMonth } from "@/lib/posts/posts";
import { schoolBranding } from "@/lib/school";
import { ui } from "@/components/admin/parts";
import { FundraisingEntry, MonthGroup, NewsEntry, whenOf } from "@/components/posts/PostTimeline";
import { PostArticle, PostBody } from "@/components/posts/PostArticle";
import { Button } from "@/components/ui/button";

// A7.4: the saved post as alumni will see it, in a frame only staff see. The outbound button goes nowhere here.
export default async function PreviewPost({ params }: { params: Promise<{ id: string }> }) {
  const { supabase, school } = await requireStaff("/admin/posts", "posts.manage");
  const [{ id }, { locale, t: all }] = await Promise.all([params, getServerTranslations()]);
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
  const covers = await coverUrls(supabase, [post.cover_path]);
  const cover = post.cover_path ? covers.get(post.cover_path) : null;
  const { shortName, networkName } = schoolBranding(school);
  const lang = locale === "fr" ? "fr-CA" : "en-CA";
  const dates = new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeZone: SCHOOL_TIME_ZONE });
  const published = post.publish_at ? new Date(post.publish_at) : new Date();
  const when = whenOf(published, lang, SCHOOL_TIME_ZONE);
  const until = post.ends_on
    ? format(t.until, { date: dates.format(new Date(`${post.ends_on}T12:00:00Z`)) })
    : null;
  const give = {
    goal: post.goal_note ? format(t.goal, { goal: post.goal_note }) : null,
    leaveNote: format(t.leaveNote, { network: networkName, school: shortName }),
    give: format(t.give, { host: hostOf(post.external_url ?? "") }),
    newTab: t.newTab,
  };

  return (
    <>
      <Link href={`/admin/posts/${post.id}`} className={ui.backLink}>
        ← {t.backToEditing}
      </Link>
      <div className={ui.shellTitle}>
        <h1>{t.preview}</h1>
        <Button asChild variant="secondary">
          <Link href={`/admin/posts/${post.id}`}>{t.keepEditing}</Link>
        </Button>
      </div>
      <div className="overflow-hidden rounded-xl border-2 border-dashed border-border-strong bg-background">
        <p
          role="note"
          className="border-b border-warning/25 bg-warning-soft px-4 py-2.5 text-sm font-bold text-warning"
        >
          {t.previewBanner}
        </p>
        <div className="flex flex-col items-center gap-8 px-4 py-7">
          <div className="w-full max-w-[760px]">
            <MonthGroup id="preview-month" label={monthLabel(schoolMonth(published), lang)}>
              {post.kind === "fundraising" ? (
                <FundraisingEntry
                  heading={post.title}
                  description={post.summary}
                  goal={give.goal}
                  until={until}
                  when={when}
                  cover={cover}
                  outboundHref={null}
                  t={{ ...give, fundraising: t.fundraising }}
                />
              ) : (
                <NewsEntry
                  href={`/admin/posts/${post.id}/preview`}
                  heading={post.title}
                  excerpt={post.summary}
                  when={when}
                  cover={cover}
                  t={{ news: t.news }}
                />
              )}
            </MonthGroup>
          </div>
          <div className="w-full max-w-[880px] rounded-lg bg-background">
            <PostArticle
              kind={post.kind}
              tag={post.kind === "news" ? t.news : t.fundraising}
              meta={post.kind === "fundraising" ? until : null}
              title={post.title}
              cover={cover}
              when={when}
            >
              <PostBody post={post} outboundHref={null} t={give} />
            </PostArticle>
          </div>
        </div>
      </div>
    </>
  );
}
