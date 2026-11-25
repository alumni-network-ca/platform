import Link from "next/link";
import { Newspaper } from "lucide-react";
import { requireStaff } from "@/lib/auth/staff";
import { read, type Search } from "@/lib/admin/data";
import { format } from "@/lib/i18n";
import { getServerTranslations } from "@/lib/i18n-server";
import { postState, SCHOOL_TIME_ZONE, type PostState } from "@/lib/posts/posts";
import { schoolBranding } from "@/lib/school";
import { cn } from "@/lib/utils";
import { ui } from "@/components/admin/parts";
import { EmptyState } from "@/components/EmptyState";
import { KindTag } from "@/components/posts/PostCards";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

// A7.1 School posts: every post of the school, newest edit first, with a chooser for a new one.

const STATE_BADGE = {
  draft: "neutral",
  scheduled: "warning",
  published: "success",
  ended: "neutral",
  archived: "neutral",
} as const satisfies Record<PostState, string>;

export default async function PostsAdmin({ searchParams }: { searchParams: Search }) {
  const { supabase, school } = await requireStaff("/admin/posts", "posts.manage");
  const [{ locale, t: all }, p] = await Promise.all([getServerTranslations(), searchParams]);
  const t = all.posts;
  const kind = p.kind === "news" || p.kind === "fundraising" ? p.kind : undefined;
  const posts = await read(
    supabase
      .from("school_posts")
      .select("id, kind, title, status, publish_at, ends_on, updated_at")
      .eq("institution_id", school.id)
      .order("updated_at", { ascending: false })
      .limit(500),
  );
  const now = new Date();
  const dates = new Intl.DateTimeFormat(locale === "fr" ? "fr-CA" : "en-CA", {
    dateStyle: "medium",
    timeZone: SCHOOL_TIME_ZONE,
  });
  const dateTimes = new Intl.DateTimeFormat(locale === "fr" ? "fr-CA" : "en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: SCHOOL_TIME_ZONE,
  });
  const day = (iso: string) => dates.format(new Date(`${iso}T12:00:00Z`));
  const rows = posts
    .filter((post) => !kind || post.kind === kind)
    .map((post) => {
      const state = postState(post, now);
      const when =
        state === "scheduled"
          ? dateTimes.format(new Date(post.publish_at!))
          : state === "published"
            ? dates.format(new Date(post.publish_at!))
            : state === "ended"
              ? format(t.endedOn, { date: day(post.ends_on!) })
              : format(t.editedOn, { date: dates.format(new Date(post.updated_at)) });
      return { ...post, state, when };
    });
  const count = (k?: "news" | "fundraising") =>
    posts.filter((post) => !k || post.kind === k).length;
  const tabs = [
    { key: undefined, label: t.all, count: count() },
    { key: "news" as const, label: t.news, count: count("news") },
    { key: "fundraising" as const, label: t.fundraising, count: count("fundraising") },
  ];
  const choice =
    "flex flex-col gap-1 rounded-lg border bg-card px-4 py-3.5 text-foreground outline-none transition-colors hover:border-input hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/45";

  return (
    <>
      <div className={ui.shellTitle}>
        <div>
          <h1>{t.adminTitle}</h1>
          <p>{format(t.adminIntro, { school: schoolBranding(school).shortName })}</p>
        </div>
      </div>
      {p.saved === "deleted" && (
        <Alert variant="success" role="status">
          {t.outcomes.deleted}
        </Alert>
      )}
      <div className="flex flex-wrap items-start gap-4.5">
        <section className="flex min-w-0 flex-[999_1_520px] flex-col gap-3.5">
          <nav className={ui.adminTabs} aria-label={t.filterLabel}>
            {tabs.map((tab) => (
              <Link
                key={tab.label}
                href={tab.key ? `/admin/posts?kind=${tab.key}` : "/admin/posts"}
                aria-current={tab.key === kind ? "page" : undefined}
              >
                {tab.label} <span className="text-muted-foreground tabular-nums">{tab.count}</span>
              </Link>
            ))}
          </nav>
          {rows.length ? (
            <div className={ui.tableBox}>
              <table className={ui.dataTable}>
                <thead>
                  <tr>
                    <th scope="col">{t.colTitle}</th>
                    <th scope="col">{t.colKind}</th>
                    <th scope="col">{t.colStatus}</th>
                    <th scope="col">{t.colDate}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((post) => (
                    <tr key={post.id} className={cn(post.state === "archived" && ui.rowMuted)}>
                      <td>
                        <Link href={`/admin/posts/${post.id}`}>{post.title}</Link>
                      </td>
                      <td>
                        <KindTag
                          kind={post.kind}
                          label={post.kind === "news" ? t.news : t.fundraising}
                        />
                      </td>
                      <td>
                        <Badge variant={STATE_BADGE[post.state]}>{t.states[post.state]}</Badge>
                      </td>
                      <td>{post.when}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={Newspaper} title={t.noPosts}>
              <p>{t.noPostsBody}</p>
            </EmptyState>
          )}
        </section>
        <aside className={cn(ui.panel, "flex-[1_1_260px] gap-2.5 px-4.5 py-4.5")}>
          <h2>{t.chooseKind}</h2>
          <Link href="/admin/posts/new?kind=news" className={choice}>
            <span className="text-md font-bold">{t.newNews}</span>
            <span className="text-sm leading-normal text-subtle-foreground">{t.newsHint}</span>
          </Link>
          <Link href="/admin/posts/new?kind=fundraising" className={choice}>
            <span className="text-md font-bold">{t.newFundraising}</span>
            <span className="text-sm leading-normal text-subtle-foreground">
              {t.fundraisingHint}
            </span>
          </Link>
        </aside>
      </div>
    </>
  );
}
