import type { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Check, Mail, X } from "lucide-react";
import { textLink } from "@/components/ui/text-link";
import { cn } from "@/lib/utils";

// The pieces of the sign-in, account creation, request and invitation pages (design SignIn, Join, Request, Pending,
// NeedsInfo, StaffAccept). One card for all of them, as on the canvas.

/**
 * The page under the nav bar. `compact` is account creation, which tightens on a short laptop screen so its button
 * stays in view.
 */
export function AuthPage({
  compact = false,
  children,
}: {
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <main
      className={cn(
        "mx-auto w-full max-w-[1112px] px-7 pt-12 pb-16 leading-[1.55] max-[800px]:px-5 max-[800px]:pt-8 max-[800px]:pb-12",
        compact &&
          "pt-6 pb-7 short:pt-4 short:pb-4 max-[800px]:px-4 max-[800px]:pt-5 max-[800px]:pb-8",
      )}
    >
      {children}
    </main>
  );
}

export const authCard = cva(
  "flex min-w-0 flex-col rounded-xl border bg-card shadow-(--shadow) wrap-anywhere",
  {
    variants: {
      size: {
        /** Beside the intro, on the split pages. */
        side: "gap-5.5 p-8 max-[800px]:p-6",
        /** Account creation, which keeps its button in view. */
        compact: "gap-4 p-6 short:gap-3 short:p-5 max-[800px]:p-5",
        /** Sign-in and the account forms. */
        narrow: "mx-auto max-w-[500px] gap-5.5 p-8 max-[800px]:p-6",
        /** A request's status, an invitation. */
        wide: "mx-auto max-w-[720px] gap-5.5 p-9 max-[800px]:p-6",
      },
    },
    defaultVariants: { size: "narrow" },
  },
);

export function AuthCard({
  size,
  className,
  children,
  ...props
}: React.ComponentProps<"section"> & VariantProps<typeof authCard>) {
  return (
    <section className={cn(authCard({ size }), className)} {...props}>
      {children}
    </section>
  );
}

/** The intro beside the card, and the card beside it; one column on a phone, the card first. */
export const split =
  "grid grid-cols-[minmax(0,1fr)_460px] items-start gap-16 max-[800px]:grid-cols-1 max-[800px]:gap-7";
export const intro = cva("grid max-[800px]:order-2 max-[800px]:pt-0", {
  variants: { compact: { true: "gap-4.5 pt-4", false: "gap-6 pt-7" } },
  defaultVariants: { compact: false },
});

export const eyebrow =
  "block text-[11px] leading-normal font-extrabold tracking-[0.12em] text-primary uppercase";
export const pageTitle =
  "text-[2.125rem] leading-[1.15] font-extrabold tracking-[-0.035em] max-[800px]:text-[1.8125rem]";
export const introTitle =
  "text-[2.875rem] leading-[1.12] font-extrabold tracking-[-0.035em] max-[800px]:text-[2.1875rem]";
export const cardTitle = "text-[1.6875rem] leading-[1.3] font-bold tracking-[-0.02em]";
export const lead = "text-lg leading-[1.65] text-subtle-foreground";
/** What the page is for, under its title. */
export const muted = "text-muted-foreground";
/** Hints and the small print. */
export const fine = "text-sm leading-normal text-muted-foreground";

/** A heading group: the eyebrow, the title and what it means, close together. */
export const stack = cva("grid", {
  variants: { compact: { true: "gap-1.5", false: "gap-2" } },
  defaultVariants: { compact: false },
});

export const form = cva("flex flex-col", {
  variants: { compact: { true: "gap-3", false: "gap-4" } },
  defaultVariants: { compact: false },
});

/** A field: its label above the control. */
export const label = "flex min-w-0 flex-col gap-[7px] text-sm font-semibold";

/** Two fields side by side, one above the other on a phone. */
export const pair = "grid grid-cols-2 items-start gap-3 max-[800px]:grid-cols-1";

/** A note with a line of the school's colour down its side: what this step does and does not do. */
export function Callout({
  as: Tag = "div",
  compact = false,
  className,
  children,
}: {
  as?: "div" | "p" | "blockquote";
  compact?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag
      className={cn(
        "rounded-r-md border-l-3 border-primary bg-secondary text-sm leading-relaxed text-subtle-foreground [&_a]:underline",
        compact ? "px-3.5 py-2.5" : "px-4 py-3.5",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/** "Already have an account? Sign in", under a line. */
export function Divider({ compact = false, children }: { compact?: boolean; children: ReactNode }) {
  return (
    <p
      className={cn(
        "border-t text-sm [&_a]:font-bold [&_a]:text-primary [&_a]:hover:underline",
        compact ? "pt-3" : "pt-5",
      )}
    >
      {children}
    </p>
  );
}

/** The links at the bottom of a card. */
export function Footer({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-3 text-sm max-[600px]:flex-col max-[600px]:items-start">
      {children}
    </div>
  );
}
export const footerLink = cn(textLink, "inline-flex items-center");

/** A round step marker: to do, the current one, done, or waiting on someone else. */
export const stepDot = cva(
  "grid shrink-0 place-items-center rounded-full border font-extrabold [&_svg]:size-[55%]",
  {
    variants: {
      state: {
        todo: "border-border-strong bg-card text-muted-foreground",
        current: "border-primary bg-primary text-primary-foreground",
        done: "border-brand bg-brand text-brand-foreground",
        waiting: "border-warning/50 bg-warning-soft text-warning",
      },
      size: { md: "size-[30px] text-xs", sm: "size-[23px] text-[10px]" },
    },
    defaultVariants: { state: "todo", size: "md" },
  },
);
export type StepState = NonNullable<VariantProps<typeof stepDot>["state"]>;

function Mark({ state, n, size }: { state: StepState; n: number; size: "md" | "sm" }) {
  return (
    <span className={stepDot({ state, size })} aria-hidden="true">
      {state === "done" ? <Check strokeWidth={3} /> : n}
    </span>
  );
}

/** Where the person is in a flow, along the top of the page: "1 Create account · 2 Request access · 3 …". */
export function StepBar({
  label: name,
  steps,
  compact = false,
}: {
  label: string;
  steps: { label: string; state: StepState }[];
  compact?: boolean;
}) {
  return (
    <ol
      className={cn(
        "flex flex-wrap gap-4.5 text-xs text-muted-foreground max-[800px]:gap-2.5",
        compact ? "mb-5 short:mb-3" : "mb-7",
      )}
      aria-label={name}
    >
      {steps.map((step, i) => (
        <li
          key={step.label}
          className="flex items-center gap-[7px] aria-[current=step]:font-bold aria-[current=step]:text-primary"
          aria-current={step.state === "current" ? "step" : undefined}
        >
          <Mark state={step.state} n={i + 1} size="sm" />
          {step.label}
        </li>
      ))}
    </ol>
  );
}

/** The steps of a flow, each with what it involves. */
export function Journey({
  steps,
  compact = false,
}: {
  steps: { title: string; body: ReactNode; state: StepState; later?: boolean }[];
  compact?: boolean;
}) {
  return (
    <ol className={cn("grid", compact ? "gap-4" : "gap-5")}>
      {steps.map((step, i) => (
        <li
          key={step.title}
          className="flex items-start gap-3.5"
          aria-current={step.state === "current" || step.state === "waiting" ? "step" : undefined}
        >
          <Mark state={step.state} n={i + 1} size="md" />
          <div>
            <h3 className={cn("text-md font-bold", step.later && "text-muted-foreground")}>
              {step.title}
            </h3>
            <p className="mt-[3px] text-sm leading-relaxed text-muted-foreground">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Label and value pairs about an invitation: role, invited by, for, valid until. */
export function Facts({
  items,
  sunken = false,
}: {
  items: [term: string, value: ReactNode][];
  /** On a white card, drawn on the page colour so it reads as a box. */
  sunken?: boolean;
}) {
  return (
    <dl
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-2.5 rounded-lg border px-5 py-4.5 text-base",
        sunken ? "bg-background" : "bg-card",
      )}
    >
      {items.map(([term, value]) => (
        <div key={term} className="contents">
          <dt className="text-muted-foreground">{term}</dt>
          <dd className="flex flex-wrap items-center gap-2 font-semibold wrap-anywhere">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** What a role can or cannot do, each line with a check or a cross. */
export function AbilityList({
  items,
  can,
  inline = false,
}: {
  items: string[];
  can: boolean;
  /** Spans instead of a list, inside a <label> (the role cards), which may only hold phrasing content. */
  inline?: boolean;
}) {
  const Icon = can ? Check : X;
  const List = inline ? "span" : "ul";
  const Item = inline ? "span" : "li";
  return (
    <List className={cn("grid gap-[7px] text-sm leading-[1.45]", !can && "text-muted-foreground")}>
      {items.map((line) => (
        <Item key={line} className="flex gap-2">
          <Icon
            aria-hidden
            strokeWidth={3}
            className={cn("mt-0.5 size-3.5 shrink-0", can && "text-success")}
          />
          {line}
        </Item>
      ))}
    </List>
  );
}

/** The envelope at the top of a "check your inbox" card. */
export function MailIcon() {
  return (
    <span
      className="grid size-[54px] place-items-center rounded-xl bg-primary-soft text-primary"
      aria-hidden="true"
    >
      <Mail className="size-6" />
    </span>
  );
}
