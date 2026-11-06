import * as React from "react";
import { cn } from "@/lib/utils";

/** The look every text field shares (also used by NativeSelect and Textarea). */
export const fieldClasses = cn(
  "w-full min-w-0 rounded-md border border-input bg-card font-normal text-foreground shadow-xs outline-none",
  // 16px on phones: iOS zooms into any field with smaller text.
  "text-[16px] sm:text-md",
  "transition-[color,border-color,box-shadow] duration-150 ease-out",
  "placeholder:text-placeholder hover:border-subtle-foreground",
  "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25",
  "disabled:cursor-not-allowed disabled:opacity-50",
  "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
);

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        fieldClasses,
        "h-11 px-3",
        // A read-only field (a copyable link, a stored colour) reads as information, not as a field to fill.
        "read-only:bg-secondary read-only:hover:border-input",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
