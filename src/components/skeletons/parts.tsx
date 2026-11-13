import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Shared pieces of the page skeletons (docs/design/ui-foundation.md, Loading). A skeleton reuses its page's own
// layout classes, so nothing moves when the content arrives; the grey blocks are hidden from screen readers and one
// status message says the page is loading.

/** What a screen reader hears while a skeleton stands in for the page. */
export function LoadingStatus({ label }: { label: string }) {
  return (
    <span role="status" className="sr-only">
      {label}
    </span>
  );
}

/** 0 … n-1, for repeating a block. */
export const times = (n: number) => Array.from({ length: n }, (_, i) => i);

const LINE_WIDTHS = ["w-full", "w-11/12", "w-4/5", "w-5/6"];

/** A paragraph: full lines, then a short last one. */
export function TextLines({ count = 2, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      {times(count).map((i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-3.5",
            count > 1 && i === count - 1 ? "w-3/5" : LINE_WIDTHS[i % LINE_WIDTHS.length],
          )}
        />
      ))}
    </div>
  );
}

/** A label over a 44px field. */
export function FieldSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Skeleton className="h-3.5 w-28" />
      <Skeleton className="h-11 w-full" />
    </div>
  );
}

/** A person's card in the directory and on the home page: avatar, name, class and role. */
export function PersonCardSkeleton({ className }: { className: string }) {
  return (
    <div className={className}>
      <div className="flex items-center gap-3">
        <Skeleton className="size-[46px] shrink-0 rounded-full" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-3.5 w-5/6" />
    </div>
  );
}
