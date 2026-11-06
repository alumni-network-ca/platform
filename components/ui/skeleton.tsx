import * as React from "react";
import { cn } from "@/lib/utils";

/** A grey block standing in for content that is loading. Purely visual: the region around it says it is busy. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn("rounded-md bg-border/70 motion-safe:animate-pulse", className)}
      {...props}
    />
  );
}

export { Skeleton };
