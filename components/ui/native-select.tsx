import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { fieldClasses } from "./input";

/**
 * A styled native <select>: it keeps form submission, next/form's submit-on-change and the phone's own picker. The
 * wrapper takes the layout classes (width, grid placement); the select fills it.
 */
function NativeSelect({
  className,
  wrapperClassName,
  size = "default",
  ...props
}: Omit<React.ComponentProps<"select">, "size"> & {
  size?: "sm" | "default";
  wrapperClassName?: string;
}) {
  return (
    <div
      data-slot="native-select-wrapper"
      className={cn("relative w-full has-[select:disabled]:opacity-50", wrapperClassName)}
    >
      <select
        data-slot="native-select"
        data-size={size}
        className={cn(
          fieldClasses,
          "h-11 cursor-pointer appearance-none py-0 pr-10 pl-3 disabled:cursor-not-allowed data-[size=sm]:h-9 data-[size=sm]:text-sm",
          className,
        )}
        {...props}
      />
      <ChevronDown
        aria-hidden
        data-slot="native-select-icon"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}

export { NativeSelect };
