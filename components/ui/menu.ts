import { cva } from "class-variance-authority";

// The look of a menu's items, shared by the account menu and the admin row menu (both WAI-ARIA menu buttons with
// their own keyboard handling, so they style plain elements rather than a menu component).

export const menuPanel =
  "rounded-lg border border-border bg-card p-1.5 text-left text-foreground shadow-md";

export const menuItem = cva(
  "flex min-h-10 w-full cursor-pointer items-center justify-between gap-2.5 rounded-md border-0 bg-transparent px-3 py-2 text-left text-base font-medium text-foreground no-underline outline-none hover:bg-accent focus:bg-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground",
  {
    variants: {
      tone: {
        default: "",
        danger: "font-bold text-destructive",
        // Not built yet: in the arrow-key order, but goes nowhere.
        soon: "cursor-default text-muted-foreground hover:bg-transparent",
      },
    },
    defaultVariants: { tone: "default" },
  },
);

export const menuChip = cva("rounded-full px-2 py-0.5 text-xs font-bold whitespace-nowrap", {
  variants: {
    kind: {
      count: "bg-primary text-primary-foreground tabular-nums",
      info: "bg-muted text-subtle-foreground",
      good: "bg-success-soft text-success",
      warn: "bg-warning-soft text-warning",
      soon: "bg-primary-chip text-primary",
    },
  },
});
