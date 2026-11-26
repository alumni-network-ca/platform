import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { PostRow } from "@/lib/posts/data";
import { Cover, KindTag } from "./PostCards";
import { GiveBlock, type When } from "./PostTimeline";
import { RichText } from "./RichText";

// One post in full (design 3.6, "timeline echo"): the day column of the list carries over to the left of the post,
// then tag, title, a short cover and the body. Shared by /posts/[id] and the admin preview. Strings arrive
// translated.

export function PostArticle({
  kind,
  tag,
  meta,
  title,
  cover,
  when,
  children,
  after,
}: {
  kind: "news" | "fundraising";
  tag: string;
  /** A line beside the tag, such as "Until January 31, 2027". */
  meta?: string | null;
  title: string;
  cover: string | null | undefined;
  when: When;
  /** The body: rich text for news, the description and the give button for fundraising. */
  children: ReactNode;
  /** Below the body, in the same column: the other posts of the month. */
  after?: ReactNode;
}) {
  return (
    <article className="grid grid-cols-[56px_minmax(0,1fr)] gap-x-7 max-[560px]:grid-cols-1 max-[560px]:gap-y-3">
      <time
        dateTime={when.iso}
        className="flex flex-col items-center self-stretch border-r-2 border-border pt-1 pr-5 leading-none max-[560px]:flex-row max-[560px]:items-baseline max-[560px]:gap-2 max-[560px]:self-auto max-[560px]:border-r-0 max-[560px]:p-0"
      >
        <span aria-hidden="true" className="text-3xl font-extrabold tabular-nums">
          {when.day}
        </span>
        <span aria-hidden="true" className="mt-1.5 text-sm text-muted-foreground max-[560px]:mt-0">
          {when.weekday}
        </span>
        <span className="sr-only">{when.full}</span>
      </time>
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <KindTag kind={kind} label={tag} />
          {meta && <span className="text-sm text-muted-foreground">{meta}</span>}
        </div>
        <h1 className="text-[2rem] leading-tight font-extrabold max-[720px]:text-2xl">{title}</h1>
        {cover && (
          <Cover
            src={cover}
            kind={kind}
            className="aspect-[3/1] rounded-lg max-[560px]:aspect-video"
          />
        )}
        <div className="max-w-[680px]">{children}</div>
        {after}
      </div>
    </article>
  );
}

/** "Also in November 2026": the other live posts of the same month, as rows of day and title. */
export function MonthNeighbours({
  heading,
  posts,
}: {
  heading: string;
  posts: { id: string; href: string; day: string; title: string; kind: "news" | "fundraising" }[];
}) {
  if (posts.length === 0) return null;
  return (
    <section aria-labelledby="also-in" className="mt-6 max-w-[680px] border-t pt-5">
      <h2 id="also-in" className="mb-2 text-md font-extrabold">
        {heading}
      </h2>
      <ul className="flex flex-col">
        {posts.map((post) => (
          <li key={post.id} className="border-b border-border-subtle last:border-b-0">
            <Link
              href={post.href}
              className="group flex items-baseline gap-4 rounded-sm py-2.5 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/45"
            >
              <span
                className={cn(
                  "w-7 shrink-0 text-right text-md font-extrabold tabular-nums",
                  post.kind === "fundraising" ? "text-primary" : "text-foreground",
                )}
              >
                {post.day}
              </span>
              <span className="text-md font-semibold group-hover:underline">{post.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The body under the title: rich text for news; for fundraising the description, goal and the give button. */
export function PostBody({
  post,
  outboundHref,
  t,
}: {
  post: Pick<PostRow, "kind" | "body" | "summary">;
  /** Our own /posts/[id]/go; null in a preview. */
  outboundHref: string | null;
  t: { goal: string | null; leaveNote: string; give: string; newTab: string };
}) {
  if (post.kind === "news") return <RichText doc={post.body} />;
  return (
    <div className="flex flex-col gap-3.5">
      {post.summary && (
        <p className="text-md leading-relaxed whitespace-pre-line">{post.summary}</p>
      )}
      {t.goal && <p className="text-md font-bold">{t.goal}</p>}
      <GiveBlock
        outboundHref={outboundHref}
        t={{ leaveNote: t.leaveNote, give: t.give, newTab: t.newTab }}
      />
    </div>
  );
}
