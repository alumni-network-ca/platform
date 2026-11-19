import { textLink } from "@/components/ui/text-link";
import { cn } from "@/lib/utils";

// The building blocks of the school admin and the platform console (design A1–A6, S1–S5), by the names the pages
// already used. A rule that styled what is inside a block (a panel's h2, a table's cells) is part of its classes here.

const focusRing = "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/45";

export const ui = {
  /** A page's title and what it is for, with its filters or main action on the right. */
  shellTitle:
    "flex flex-wrap items-end justify-between gap-4 [&_h1]:text-3xl [&_h1]:font-extrabold [&_p]:mt-1.5 [&_p]:text-md [&_p]:text-subtle-foreground",
  backLink: cn(textLink, "self-start text-base"),

  /** The dashboard's numbers: as many columns as fit, filling the row. */
  statGrid: "grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5",
  statCard: cn(
    "flex flex-col gap-2 rounded-lg border bg-card px-5 py-4.5 transition-[border-color,box-shadow]",
    "[a&]:hover:border-input [a&]:hover:shadow-sm [a&]:outline-none [a&]:focus-visible:ring-[3px] [a&]:focus-visible:ring-ring/45",
  ),
  statLabel: "text-sm font-semibold text-subtle-foreground",
  statValue: "text-4xl leading-none font-extrabold tabular-nums",

  /** A white box of related content. */
  panel:
    "flex flex-col gap-3.5 rounded-lg border bg-card px-6 py-5.5 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:mt-1.5 [&_h3]:text-md [&_h3]:font-bold",
  /** Something done by the platform team, or that needs care. */
  panelWarn: "border-warning/25 bg-warning-soft",
  panelGrid:
    "grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-start gap-4 max-[800px]:grid-cols-1",
  adminStack: "flex flex-col gap-3.5",
  formStack: "flex flex-col gap-4",

  /** A table in a box that scrolls sideways on a phone. Figures line up (tabular). */
  // Relative, so a screen-reader-only header (absolute) stays inside the scroll box instead of widening the page.
  tableBox: "relative overflow-x-auto rounded-lg border bg-card",
  dataTable: cn(
    "w-full min-w-[640px] border-collapse text-base tabular-nums",
    "[&_th]:px-5 [&_th]:py-3.5 [&_th]:text-left [&_th]:text-xs [&_th]:font-bold [&_th]:tracking-[0.06em] [&_th]:text-subtle-foreground [&_th]:uppercase",
    "[&_td]:border-t [&_td]:border-border-subtle [&_td]:px-5 [&_td]:py-3 [&_td]:align-top",
    // Text links in a cell; a button drawn as a link keeps its own colours.
    "[&_a:not([data-slot])]:font-bold [&_a:not([data-slot])]:text-foreground [&_a:not([data-slot])]:hover:underline",
  ),
  cellActions: "w-[1%] text-right whitespace-nowrap",
  cellSub: "block text-sm font-normal text-muted-foreground",
  tableTitle: "px-5 pt-4 pb-1 text-[1rem] font-bold",
  tableEmpty: "px-5 pt-3 pb-4",
  tableNote: "border-t border-border-subtle px-5 pt-3 pb-4",
  rowMuted: "[&>td]:text-muted-foreground",
  /** A table row that opens a page: its one link is stretched over the whole row (design SaSchools). */
  rowLink: "relative cursor-pointer hover:[&>td]:bg-accent/60",
  rowLinkTarget:
    "text-platform-mark! outline-none after:absolute after:inset-0 after:content-[''] hover:underline focus-visible:underline",
  adminSupport: "[&>td]:bg-warning-soft",

  /** A field: its label above the control, then a hint. */
  field: "flex min-w-0 flex-col gap-1.5 text-sm font-semibold",
  fieldHint: "text-xs font-normal text-muted-foreground",
  formRow: "grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5",
  formActions: "flex flex-wrap items-center justify-end gap-2.5",
  adminActions: "flex flex-wrap items-center gap-2.5",
  adminFilters: "flex flex-wrap items-end gap-3.5",
  copyBox: "flex flex-wrap gap-2",
  /** An invitation link in a read-only field, with its Copy button. */
  linkRow: "flex flex-wrap items-end gap-2.5 [&>label]:flex-[1_1_320px]",

  /** A radio or checkbox drawn as a card; the picked one gets a second line of the school's colour inside. */
  choice: cn(
    "flex cursor-pointer items-start gap-3 rounded-lg border border-border-strong bg-card px-4.5 py-4 text-base transition-colors hover:border-input",
    "has-checked:border-primary has-checked:bg-primary-soft has-checked:ring-1 has-checked:ring-primary has-checked:ring-inset",
    "has-disabled:cursor-not-allowed has-disabled:opacity-60 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring",
    "[&>input]:mt-0.5 [&>input]:size-[18px] [&>input]:shrink-0 [&>input]:accent-primary",
  ),

  detailList:
    "grid grid-cols-[minmax(120px,auto)_1fr] gap-x-4 gap-y-2 text-base [&_dd]:font-semibold [&_dd]:wrap-anywhere [&_dt]:text-muted-foreground",
  adminDetails:
    "grid grid-cols-[minmax(100px,1fr)_2fr] gap-x-5 gap-y-2.5 max-[800px]:grid-cols-1 max-[800px]:gap-1.5 [&_dd]:wrap-anywhere [&_dd]:whitespace-pre-wrap max-[800px]:[&_dd]:mb-2.5 [&_dt]:text-subtle-foreground",
  /** A match with an existing record. */
  adminMatch: "border-success/60",
  adminDialog: "w-full max-w-[640px] self-center",

  /** The dashboard's "needs you" banner, which opens the queue. */
  adminHero: cn(
    "flex flex-wrap items-center justify-between gap-4 rounded-lg bg-brand px-6 py-5.5 text-brand-foreground transition-colors hover:bg-brand-deep",
    "[&_small]:mb-1.5 [&_small]:block [&_small]:font-bold [&_small]:text-on-brand-accent [&_strong]:block [&_strong]:text-[1.375rem]",
    focusRing,
  ),
  /** Tabs under a page's title: the current one is underlined in the school's colour. */
  adminTabs: cn(
    "flex flex-wrap gap-1.5 border-b",
    "[&_a]:-mb-px [&_a]:border-b-3 [&_a]:border-transparent [&_a]:px-4 [&_a]:py-3 [&_a]:text-foreground [&_a]:outline-none [&_a]:hover:border-border-strong [&_a]:focus-visible:bg-accent",
    "[&_a[aria-current=page]]:border-primary [&_a[aria-current=page]]:font-bold",
  ),
  adminChips: "flex flex-wrap gap-2",
  /** A filter that is a link, with the current one marked (the audit log's types). */
  filterChip: cn(
    "inline-flex rounded-full bg-muted px-3 py-1 text-xs font-bold whitespace-nowrap text-foreground transition-colors hover:bg-border",
    "aria-[current=page]:bg-primary-soft aria-[current=page]:text-primary",
    focusRing,
  ),

  /** A button that reads as a small link. */
  textButton:
    "cursor-pointer bg-transparent px-0 py-[3px] text-xs font-bold text-primary outline-none hover:underline focus-visible:underline",

  // The staff invitation form (A5.1) and the role cards (A5).
  inviteLayout: "flex flex-wrap items-start gap-5",
  inviteForm: "min-w-0 flex-[999_1_540px] gap-6",
  inviteAside:
    "flex flex-[1_1_280px] flex-col gap-3.5 [&_a]:text-base [&_a]:font-semibold [&_strong]:text-foreground",
  /** A panel in the invitation's side column: smaller type. */
  inviteAsidePanel:
    "gap-3 px-5.5 py-5 text-sm leading-normal text-subtle-foreground [&_h2]:text-md [&_h2]:text-foreground",
  invitePreview: "flex flex-col gap-1.5 rounded-md bg-secondary px-4 py-3.5",
  inviteActions: "justify-start border-t border-border-subtle pt-4.5",
  inviteResult: "",
  inviteEmail: "max-w-[440px]",
  roleCards:
    "grid min-w-0 grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3.5 [&_legend]:mb-3 [&_legend]:text-sm [&_legend]:font-semibold",
  roleCard: cn(
    "flex cursor-pointer flex-col gap-2.5 rounded-lg border bg-card p-4.5 transition-colors hover:border-input",
    "has-checked:border-primary has-checked:bg-primary-soft has-checked:ring-1 has-checked:ring-primary has-checked:ring-inset",
    "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring",
  ),
  roleCardHead:
    "flex items-center gap-2.5 text-[1rem] [&_input]:size-[18px] [&_input]:accent-primary",
  roleCardLabel: "text-xs font-bold tracking-[0.06em] text-muted-foreground uppercase",

  // The welcome banner after accepting a staff invitation (A6.6).
  welcomeBanner: "grid gap-4.5 rounded-xl bg-brand px-7 py-6.5 text-brand-foreground",
  welcomeHead:
    "flex flex-wrap items-start justify-between gap-x-7 gap-y-3.5 [&_h2]:text-[1.625rem] [&_h2]:font-extrabold [&_h2]:tracking-[-0.02em] [&_p]:mt-2 [&_p]:text-on-brand-soft",
  welcomeCards: "grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3",
  welcomeCard: cn(
    "grid gap-1.5 rounded-lg bg-card p-4.5 text-base leading-normal text-foreground transition-shadow hover:shadow-md [&_span]:text-subtle-foreground",
    focusRing,
  ),

  // The row menu's result and link (components/admin/RowMenu.tsx).
  rowMenu: "inline-flex flex-col items-end gap-2 whitespace-normal",
  rowMenuNotice: "max-w-[280px] text-left",
  rowMenuLink: "w-[240px] text-left [&>label]:min-w-0 [&>label]:basis-full",
} as const;

export type UiName = keyof typeof ui;
