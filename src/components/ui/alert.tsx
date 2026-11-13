import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

// A message about what just happened or what to know: a form's error, a sent email, an open grant. Its words carry
// the meaning, the colour and icon only back them up. The caller sets the role: "alert" for an error that needs
// attention now, "status" for news.
const alertVariants = cva(
  "flex items-start gap-2.5 rounded-md px-3.5 py-3 text-sm leading-normal [&_a]:font-bold [&_a]:underline [&_a]:underline-offset-2",
  {
    variants: {
      variant: {
        info: "bg-primary-soft text-primary",
        success: "bg-success-soft text-success",
        warning: "bg-warning-soft text-warning",
        error: "bg-destructive-soft text-destructive",
      },
    },
    defaultVariants: { variant: "info" },
  },
);

const ICONS = { info: Info, success: CircleCheck, warning: TriangleAlert, error: CircleAlert };

function Alert({
  className,
  variant = "info",
  children,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  const Icon = ICONS[variant ?? "info"];
  return (
    <div
      data-slot="alert"
      data-variant={variant}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export { Alert, alertVariants };
