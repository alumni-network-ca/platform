import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { panel } from "@/components/alumni/parts";

// The cards of the School posts page (design 3.5, A7.4). Strings arrive translated; the cards decide nothing.

const KIND_TAG = {
  news: "bg-info-soft text-info",
  fundraising: "bg-primary-soft text-primary",
} as const;

export function KindTag({ kind, label }: { kind: keyof typeof KIND_TAG; label: string }) {
  return (
    <span className={cn("rounded-md px-2.5 py-0.5 text-xs font-bold", KIND_TAG[kind])}>
      {label}
    </span>
  );
}

/**
 * A post's cover. The image is decorative (the title says what the post is), so it has no text alternative. With no
 * image, a band in the school's colours keeps the cards the same shape.
 */
export function Cover({
  src,
  kind,
  className,
}: {
  src: string | null | undefined;
  kind: keyof typeof KIND_TAG;
  className?: string;
}) {
  return src ? (
    // A short-lived signed address from private storage: next/image can't cache it, so a plain img.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={cn("aspect-video w-full bg-muted object-cover", className)} />
  ) : (
    <div
      aria-hidden="true"
      className={cn(
        "aspect-video w-full",
        kind === "fundraising"
          ? "bg-[linear-gradient(135deg,var(--color-primary),var(--color-pink))]"
          : "bg-[linear-gradient(135deg,var(--color-brand),var(--color-brand-deep))]",
        className,
      )}
    />
  );
}

const card = cn(panel, "flex h-full flex-col overflow-hidden");
const cardBody = "flex flex-1 flex-col gap-2.5 px-5 pt-4.5 pb-5";
const cardTitle = "text-[1.1875rem] leading-snug font-extrabold";
const cardText = "text-md leading-normal text-subtle-foreground";

export function NewsCard({
  href,
  title,
  excerpt,
  date,
  cover,
  t,
}: {
  href: string;
  title: string;
  excerpt: string | null;
  date: string;
  cover: string | null | undefined;
  t: { news: string; readMore: string };
}) {
  return (
    <article className={card}>
      <Cover src={cover} kind="news" />
      <div className={cardBody}>
        <div className="flex flex-wrap items-center gap-2">
          <KindTag kind="news" label={t.news} />
          <span className="text-sm text-muted-foreground">{date}</span>
        </div>
        <h2 className={cardTitle}>
          <Link href={href} className="outline-none hover:underline focus-visible:underline">
            {title}
          </Link>
        </h2>
        {excerpt && <p className={cardText}>{excerpt}</p>}
        <Link
          href={href}
          className="mt-auto self-start text-base font-bold text-primary hover:underline"
        >
          {t.readMore} <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}

export function FundraisingCard({
  title,
  description,
  goal,
  until,
  cover,
  outboundHref,
  t,
  headingLevel = 2,
}: {
  title: string;
  description: string | null;
  goal: string | null;
  until: string | null;
  cover: string | null | undefined;
  /** Our own /posts/[id]/go, which records the click and sends the reader on; null in a preview. */
  outboundHref: string | null;
  t: { fundraising: string; leaveNote: string; give: string; newTab: string };
  headingLevel?: 1 | 2;
}) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  const button =
    "inline-flex h-11 items-center gap-2 self-start rounded-md bg-primary px-4 text-base font-bold text-primary-foreground hover:bg-primary-hover focus-visible:ring-[3px] focus-visible:ring-ring/45 focus-visible:outline-none";
  return (
    <article className={card}>
      <Cover src={cover} kind="fundraising" />
      <div className={cardBody}>
        <div className="flex flex-wrap items-center gap-2">
          <KindTag kind="fundraising" label={t.fundraising} />
          {until && <span className="text-sm text-muted-foreground">{until}</span>}
        </div>
        <Heading className={cardTitle}>{title}</Heading>
        {description && <p className={cn(cardText, "whitespace-pre-line")}>{description}</p>}
        {goal && <p className="text-base font-bold">{goal}</p>}
        <p className="mt-1 flex items-start gap-2.5 rounded-md border bg-background px-3.5 py-3 text-sm leading-normal text-subtle-foreground">
          <ExternalLink aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{t.leaveNote}</span>
        </p>
        {outboundHref ? (
          <a href={outboundHref} target="_blank" rel="noopener noreferrer" className={button}>
            {t.give}
            <ExternalLink aria-hidden="true" className="size-4" />
            <span className="sr-only">{t.newTab}</span>
          </a>
        ) : (
          <span className={cn(button, "cursor-default")}>
            {t.give}
            <ExternalLink aria-hidden="true" className="size-4" />
          </span>
        )}
      </div>
    </article>
  );
}
