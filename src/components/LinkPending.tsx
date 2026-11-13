"use client";

import { useLinkStatus } from "next/link";
import { cn } from "@/lib/utils";

/**
 * A thin bar along the bottom of a <Link> while the page it opens is on its way: for waits a prefetched skeleton
 * does not cover (a layout that checks access, a page not prefetched). It is always rendered and fades in only
 * after 150 ms, so a fast navigation shows nothing and nothing moves. Put it inside the Link, which needs `relative`.
 */
export function LinkPending({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden="true"
      data-pending={pending || undefined}
      className={cn(
        "pointer-events-none absolute inset-x-3 bottom-1 h-0.5 overflow-hidden rounded-full opacity-0 transition-opacity data-pending:opacity-100 data-pending:delay-150",
        className,
      )}
    >
      <span className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-current motion-safe:animate-link-pending motion-reduce:w-full" />
    </span>
  );
}
