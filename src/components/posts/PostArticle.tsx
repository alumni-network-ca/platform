import type { PostRow } from "@/lib/posts/data";
import { panel } from "@/components/alumni/parts";
import { cn } from "@/lib/utils";
import { Cover, KindTag } from "./PostCards";
import { RichText } from "./RichText";

/** A news post in full (design 3.6): cover, tag and date, title, body. Shared by /posts/[id] and the preview. */
export function PostArticle({
  post,
  cover,
  date,
  t,
}: {
  post: Pick<PostRow, "title" | "body">;
  cover: string | null | undefined;
  date: string;
  t: { news: string };
}) {
  return (
    <article className={cn(panel, "overflow-hidden")}>
      <Cover src={cover} kind="news" />
      <div className="flex flex-col gap-3.5 px-8 pt-7 pb-9 max-[720px]:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <KindTag kind="news" label={t.news} />
          <span className="text-sm text-muted-foreground">{date}</span>
        </div>
        <h1 className="text-[1.875rem] leading-tight font-extrabold max-[720px]:text-2xl">
          {post.title}
        </h1>
        <RichText doc={post.body} />
      </div>
    </article>
  );
}
