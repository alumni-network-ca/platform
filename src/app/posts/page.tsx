import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAccess } from "@/lib/auth/account";
import { format } from "@/lib/i18n";
import { getServerTranslations } from "@/lib/i18n-server";
import { coverUrls, liveKinds, livePostsQuery, type PostRow } from "@/lib/posts/data";
import { groupByMonth, hostOf, monthLabel, SCHOOL_TIME_ZONE } from "@/lib/posts/posts";
import { schoolBranding } from "@/lib/school";
import { cn } from "@/lib/utils";
import { frame, pageTitle } from "@/components/alumni/parts";
import { FundraisingEntry, MonthGroup, NewsEntry, whenOf } from "@/components/posts/PostTimeline";

// 3.5 School posts (POST-03): the school's published, live posts, newest first and grouped by month on a timeline,
// with an All / News / Fundraising filter that lists only the kinds the school has. A school with no live post has no page (and no nav entry).

const PAGE_SIZE = 24;

export default async function Posts({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { supabase, school } = await requireAccess("/posts");
  const [p, { locale, t: all }] = await Promise.all([searchParams, getServerTranslations()]);
  const t = all.posts;
  const now = new Date();
  const kinds = await liveKinds(supabase, school.id, now);
  if (!kinds.news && !kinds.fundraising) notFound();
  const wanted = p.kind === "news" || p.kind === "fundraising" ? p.kind : undefined;
  const kind = wanted && kinds[wanted] ? wanted : undefined;
  const page = Math.max(1, Math.min(1000, Number.parseInt(p.page ?? "1", 10) || 1));
  const { data, count, error } = await livePostsQuery(supabase, school.id, now, kind).range(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE - 1,
  );
  if (error) throw new Error(`Could not load the school posts: ${error.message}`);
  const posts = (data ?? []) as PostRow[];
  const covers = await coverUrls(
    supabase,
    posts.map((post) => post.cover_path),
  );
  const { shortName, networkName } = schoolBranding(school);
  const lang = locale === "fr" ? "fr-CA" : "en-CA";
  const dates = new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeZone: SCHOOL_TIME_ZONE });
  const chips = [
    { key: undefined, label: t.all, show: kinds.news > 0 && kinds.fundraising > 0 },
    { key: "news" as const, label: t.news, show: kinds.news > 0 },
    { key: "fundraising" as const, label: t.fundraising, show: kinds.fundraising > 0 },
  ].filter((chip) => chip.show);
  const href = (k: string | undefined, n = 1) => {
    const q = new URLSearchParams();
    if (k) q.set("kind", k);
    if (n > 1) q.set("page", String(n));
    const query = q.toString();
    return query ? `/posts?${query}` : "/posts";
  };
  const pages = Math.ceil((count ?? 0) / PAGE_SIZE);
  const chip =
    "inline-flex h-9 items-center rounded-full border border-border-strong bg-card px-4 text-base font-bold text-foreground outline-none hover:border-input focus-visible:ring-[3px] focus-visible:ring-ring/45 aria-[current=page]:border-brand aria-[current=page]:bg-brand aria-[current=page]:text-brand-foreground";

  return (
    <main className={cn(frame.stack, "max-w-[880px]")}>
      <div className="flex flex-col gap-1.5">
        <h1 className={pageTitle}>{format(t.pageTitle, { school: shortName })}</h1>
        <p className="text-md text-subtle-foreground">{t.pageIntro}</p>
      </div>
      {chips.length > 1 && (
        <nav aria-label={t.filterLabel} className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <Link
              key={c.label}
              href={href(c.key)}
              className={chip}
              aria-current={c.key === kind ? "page" : undefined}
            >
              {c.label}
            </Link>
          ))}
        </nav>
      )}
      <div className="flex flex-col gap-7">
        {groupByMonth(posts).map(({ month, posts: inMonth }) => (
          <MonthGroup key={month} id={`month-${month}`} label={monthLabel(month, lang)}>
            {inMonth.map((post) => {
              const cover = post.cover_path ? covers.get(post.cover_path) : null;
              const when = whenOf(new Date(post.publish_at!), lang, SCHOOL_TIME_ZONE);
              return post.kind === "fundraising" ? (
                <FundraisingEntry
                  key={post.id}
                  heading={post.title}
                  description={post.summary}
                  goal={post.goal_note ? format(t.goal, { goal: post.goal_note }) : null}
                  until={
                    post.ends_on
                      ? format(t.until, {
                          date: dates.format(new Date(`${post.ends_on}T12:00:00Z`)),
                        })
                      : null
                  }
                  when={when}
                  cover={cover}
                  outboundHref={`/posts/${post.id}/go`}
                  t={{
                    fundraising: t.fundraising,
                    leaveNote: format(t.leaveNote, { network: networkName, school: shortName }),
                    give: format(t.give, { host: hostOf(post.external_url ?? "") }),
                    newTab: t.newTab,
                  }}
                />
              ) : (
                <NewsEntry
                  key={post.id}
                  href={`/posts/${post.id}`}
                  heading={post.title}
                  excerpt={post.summary}
                  when={when}
                  cover={cover}
                  t={{ news: t.news }}
                />
              );
            })}
          </MonthGroup>
        ))}
      </div>
      {pages > 1 && (
        <nav aria-label={t.pagination} className="flex items-center justify-center gap-4 text-base">
          {page > 1 && (
            <Link href={href(kind, page - 1)} className="font-bold text-primary hover:underline">
              ← {t.newer}
            </Link>
          )}
          <span className={cn("text-muted-foreground tabular-nums")}>
            {format(t.pageOf, { page, pages })}
          </span>
          {page < pages && (
            <Link href={href(kind, page + 1)} className="font-bold text-primary hover:underline">
              {t.older} →
            </Link>
          )}
        </nav>
      )}
    </main>
  );
}
