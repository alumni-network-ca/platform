import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { cva } from "class-variance-authority";
import { LinkPending } from "@/components/LinkPending";
import { cn } from "@/lib/utils";

// The pieces the alumni pages share (home, the directory, /me, a profile, onboarding; design Home, Directory, Me,
// Profile and Onb*). Their skeletons (components/skeletons/alumni.tsx) use the same classes, so nothing moves when
// the content arrives.

const gutters = "px-6 pb-14 max-[720px]:px-4 max-[720px]:pt-6 max-[720px]:pb-10";

/** Page frames: width, padding and the gap between blocks. */
export const frame = {
  /** One column of blocks: home and the directory. */
  stack: cn("mx-auto flex w-full max-w-[1200px] flex-col gap-6 pt-9", gutters),
  /** A main column with a side column that wraps under it on a narrow screen: /me and a profile. */
  split: cn("mx-auto flex w-full max-w-[1120px] flex-wrap items-start gap-6 pt-8", gutters),
  /** A form card, with the onboarding steps beside it: onboarding and the forms under /me. */
  form: cn("mx-auto flex w-full max-w-[1120px] flex-wrap items-start gap-7 pt-10", gutters),
  /** The forms under /me, which have no steps beside them. */
  narrow: "max-w-[860px]",
};

/** Two columns that stack when the side one would get narrower than 280px. */
export const columns = "flex flex-wrap items-start gap-6";
export const mainColumn = "flex min-w-0 flex-[999_1_560px] flex-col gap-5";
export const sideColumn = "flex min-w-0 flex-[1_1_280px] flex-col gap-4";

/** A white card: sections of a profile, the home page's panels, the directory's filters. */
export const panel = "rounded-lg border bg-card";

/** A card or panel heading. */
export const sectionTitle = "text-lg leading-snug font-bold";

export { textLink } from "@/components/ui/text-link";

/** A page's small uppercase line above its title. */
export const eyebrow = "text-xs font-bold tracking-[0.08em] text-primary uppercase";

/** A page title. */
export const pageTitle = "text-4xl font-extrabold max-[720px]:text-[1.625rem]";

const AVATAR = {
  sm: "size-[34px] text-xs",
  md: "size-[46px] text-md",
  lg: "size-[52px] text-lg",
  xl: "size-[84px] text-3xl",
};

/**
 * A person's initials in a circle. `tint` picks a colour per person (config/ui.ts) so a grid of people is easy to
 * scan; without it the circle is the design's pink. Decorative: the name is always next to it.
 */
export function Avatar({
  initials,
  tint,
  size = "md",
  className,
}: {
  initials: string;
  tint?: string;
  size?: keyof typeof AVATAR;
  className?: string;
}) {
  const style: CSSProperties | undefined = tint ? { backgroundColor: tint } : undefined;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-pink leading-none font-extrabold text-foreground",
        AVATAR[size],
        className,
      )}
      style={style}
    >
      {initials}
    </span>
  );
}

const tag = cva("rounded-full bg-primary-tint font-bold whitespace-nowrap text-primary-hover", {
  variants: { size: { sm: "px-2.5 py-1 text-xs", md: "px-3 py-1.5 text-sm" } },
  defaultVariants: { size: "sm" },
});

/** What someone is open to, as pills. With `max`, the rest are counted in a last "+n" pill. */
export function Tags({
  labels,
  max,
  size = "sm",
  className,
}: {
  labels: string[];
  max?: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const shown = max === undefined ? labels : labels.slice(0, max);
  const more = labels.length - shown.length;
  return (
    <span className={cn("flex flex-wrap", size === "sm" ? "gap-1.5" : "gap-2", className)}>
      {shown.map((label) => (
        <span key={label} className={tag({ size })}>
          {label}
        </span>
      ))}
      {more > 0 && <span className={tag({ size })}>+{more}</span>}
    </span>
  );
}

/** A person in a grid (home, the directory): the whole card opens their profile. */
export const personCard =
  "relative flex h-full flex-col gap-3 rounded-lg border bg-card p-4.5 text-foreground outline-none transition-[border-color,box-shadow] hover:border-input hover:shadow-sm focus-visible:ring-[3px] focus-visible:ring-ring/45";

export function PersonCard({
  href,
  avatar,
  name,
  meta,
  role,
  children,
}: {
  href: string;
  avatar: ReactNode;
  name: string;
  meta: string;
  role?: string;
  /** Tags under the role. */
  children?: ReactNode;
}) {
  return (
    // Not prefetched: a profile checks access in its layout, one read per card.
    <Link className={personCard} href={href} prefetch={false}>
      <span className="flex items-center gap-3">
        {avatar}
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[1rem] leading-snug font-extrabold">{name}</span>
          <span className="text-sm text-muted-foreground">{meta}</span>
        </span>
      </span>
      {role && <span className="text-base leading-[1.45] text-subtle-foreground">{role}</span>}
      {children}
      <LinkPending className="inset-x-4.5 bottom-2 text-primary" />
    </Link>
  );
}

/** A grid of person cards, as many columns as fit: the home page's, and the directory's wider ones. */
export const personGrid = "grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3.5";
export const directoryGrid = "grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3.5";

/** A message on a green or amber ground, said with words (and the colour). */
export const notice = cva("rounded-lg border px-5 py-4 text-base", {
  variants: {
    tone: {
      good: "border-success/25 bg-success-soft font-semibold text-success",
      warn: "border-warning/25 bg-warning-soft text-warning",
    },
  },
});

/** A green or grey dot before "Visible to …" or "Hidden". */
export function VisibilityDot({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn("size-[9px] shrink-0 rounded-full", on ? "bg-success-dot" : "bg-input")}
    />
  );
}
