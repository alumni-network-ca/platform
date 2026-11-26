import Link from "next/link";
import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Cover, KindTag } from "./PostCards";

// The School posts list as a timeline (design 3.5, variant D): posts under a heading per month, each with its day in
// a column on the left, a line down the side, and a small cover on the right. Strings arrive translated.

/** One month of posts: a heading and the line the entries hang from. */
export function MonthGroup({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h2 id={id} className="text-md font-extrabold text-primary">
        {label}
      </h2>
      <ol className="flex flex-col border-l-2 border-border">{children}</ol>
    </section>
  );
}

/** The day a post went live, large, with the weekday under it; screen readers get the full date instead. */
type When = { day: string; weekday: string; full: string; iso: string };

function Entry({
  kind,
  when,
  cover,
  children,
}: {
  kind: "news" | "fundraising";
  when: When;
  cover: string | null | undefined;
  children: ReactNode;
}) {
  return (
    <li className="relative pl-5 max-[560px]:pl-3.5">
      <span
        aria-hidden="true"
        className={cn(
          "absolute top-6 -left-[7px] size-3 rounded-full border-2 border-background",
          kind === "fundraising" ? "bg-primary" : "bg-brand",
        )}
      />
      <article
        className={cn(
          "grid grid-cols-[44px_minmax(0,1fr)_auto] items-start gap-x-4 rounded-lg px-3 py-4 max-[560px]:grid-cols-[36px_minmax(0,1fr)] max-[560px]:gap-x-3 max-[560px]:px-2",
          kind === "fundraising" ? "bg-primary-soft/40" : "hover:bg-card",
        )}
      >
        <time dateTime={when.iso} className="flex flex-col items-center pt-0.5 leading-none">
          <span aria-hidden="true" className="text-2xl font-extrabold tabular-nums">
            {when.day}
          </span>
          <span aria-hidden="true" className="mt-1 text-xs text-muted-foreground">
            {when.weekday}
          </span>
          <span className="sr-only">{when.full}</span>
        </time>
        <div className="flex min-w-0 flex-col gap-1.5">{children}</div>
        {cover && (
          <Cover
            src={cover}
            kind={kind}
            className="w-40 rounded-md max-[720px]:w-28 max-[560px]:hidden"
          />
        )}
      </article>
    </li>
  );
}

const title = "text-lg leading-snug font-extrabold";
const text = "text-base leading-normal text-subtle-foreground";

export function NewsEntry({
  href,
  heading,
  excerpt,
  when,
  cover,
  t,
}: {
  href: string;
  heading: string;
  excerpt: string | null;
  when: When;
  cover: string | null | undefined;
  t: { news: string };
}) {
  return (
    <Entry kind="news" when={when} cover={cover}>
      <div className="flex flex-wrap items-center gap-2">
        <KindTag kind="news" label={t.news} />
      </div>
      <h3 className={title}>
        <Link
          href={href}
          className="outline-none after:absolute after:inset-0 hover:underline focus-visible:underline"
        >
          {heading}
        </Link>
      </h3>
      {excerpt && <p className={cn(text, "line-clamp-2")}>{excerpt}</p>}
    </Entry>
  );
}

export function FundraisingEntry({
  heading,
  description,
  goal,
  until,
  when,
  cover,
  outboundHref,
  t,
}: {
  heading: string;
  description: string | null;
  goal: string | null;
  until: string | null;
  when: When;
  cover: string | null | undefined;
  /** Our own /posts/[id]/go, which records the click and sends the reader on; null in a preview. */
  outboundHref: string | null;
  t: { fundraising: string; leaveNote: string; give: string; newTab: string };
}) {
  const label = (
    <>
      {t.give}
      <ExternalLink aria-hidden="true" />
    </>
  );
  return (
    <Entry kind="fundraising" when={when} cover={cover}>
      <div className="flex flex-wrap items-center gap-2">
        <KindTag kind="fundraising" label={t.fundraising} />
        {until && <span className="text-sm text-muted-foreground">{until}</span>}
      </div>
      <h3 className={title}>{heading}</h3>
      {description && <p className={cn(text, "whitespace-pre-line")}>{description}</p>}
      {goal && <p className="text-base font-bold">{goal}</p>}
      <p className="flex items-start gap-2 text-sm leading-normal text-subtle-foreground">
        <ExternalLink aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
        <span>{t.leaveNote}</span>
      </p>
      <div className="pt-1">
        {outboundHref ? (
          <Button asChild size="sm">
            <a href={outboundHref} target="_blank" rel="noopener noreferrer">
              {label}
              <span className="sr-only">{t.newTab}</span>
            </a>
          </Button>
        ) : (
          <Button size="sm" type="button" className="cursor-default">
            {label}
          </Button>
        )}
      </div>
    </Entry>
  );
}

/** The day, weekday and full date of an instant, in the given locale and zone. */
export function whenOf(instant: Date, locale: string, timeZone: string): When {
  const part = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, { ...options, timeZone }).format(instant);
  return {
    day: part({ day: "numeric" }),
    weekday: part({ weekday: "short" }),
    full: part({ dateStyle: "long" }),
    iso: instant.toISOString(),
  };
}
