import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

// docs/design/ui-foundation.md: one primary action per view; heights 36 / 44 / 48; 8px corners.
const buttonVariants = cva(
  [
    "relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md border border-transparent",
    "font-semibold whitespace-nowrap no-underline select-none outline-none",
    "transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-out",
    "focus-visible:ring-[3px] focus-visible:ring-ring/45 active:translate-y-px",
    "disabled:pointer-events-none disabled:opacity-50 aria-busy:cursor-progress",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.14),var(--shadow-xs)] hover:bg-primary-hover",
        secondary:
          "border-border-strong bg-card text-foreground shadow-xs hover:border-input hover:bg-accent",
        ghost: "text-foreground hover:bg-accent",
        destructive:
          "bg-destructive text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.14),var(--shadow-xs)] hover:bg-destructive-hover focus-visible:ring-destructive/35",
        "destructive-outline":
          "border-destructive/60 bg-card text-destructive hover:border-destructive hover:bg-destructive-soft focus-visible:ring-destructive/35",
        // On a brand-coloured panel (the admin dashboard's hero).
        inverse: "bg-white text-brand shadow-xs hover:bg-white/90 focus-visible:ring-white/60",
        link: "h-auto rounded-sm border-0 px-0 text-primary underline-offset-4 hover:underline active:translate-y-0",
      },
      size: {
        sm: "h-9 gap-1.5 px-3 text-sm",
        default: "h-11 px-4 text-base",
        lg: "h-12 px-5 text-md",
        "icon-sm": "size-9",
        icon: "size-11",
      },
    },
    compoundVariants: [{ variant: "link", className: "h-auto px-0" }],
    defaultVariants: { variant: "default", size: "default" },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Render the child element (a Link, say) with the button's look instead of a <button>. */
    asChild?: boolean;
    /** Waiting on the server: shows a spinner, sets aria-busy and blocks clicks. Not for asChild. */
    loading?: boolean;
  };

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  if (asChild) {
    return (
      <Slot.Root
        data-slot="button"
        data-variant={variant}
        data-size={size}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {children}
      </Slot.Root>
    );
  }
  return (
    <button
      data-slot="button"
      data-variant={variant}
      data-size={size}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {loading && <Loader2 aria-hidden className="animate-spin" />}
      {children}
    </button>
  );
}

export { Button, buttonVariants, type ButtonProps };
