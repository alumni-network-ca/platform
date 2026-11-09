import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Nothing to show yet, said the same way everywhere (docs/design/ui-foundation.md): an icon, one line on what is
 * missing, an optional hint, and the action that fills it when there is one.
 */
export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-lg border border-dashed border-border-strong bg-card px-6 py-10 text-center",
        className,
      )}
    >
      {Icon && (
        <span
          aria-hidden="true"
          className="mb-1 grid size-10 place-items-center rounded-full bg-secondary text-subtle-foreground"
        >
          <Icon className="size-5" />
        </span>
      )}
      <p className="m-0 text-base font-semibold text-foreground">{title}</p>
      {children && (
        <div className="max-w-prose text-sm text-muted-foreground [&_p]:m-0">{children}</div>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
