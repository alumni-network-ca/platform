"use client";

import Form from "next/form";
import { SlidersHorizontal } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { panel } from "@/components/alumni/parts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The directory's search and filters as one GET form (DIR-02): the URL holds every filter, so a search can be
 * shared and the back button works. Changing a select or an option submits at once; the search box submits on
 * Enter. next/form keeps it a client-side navigation.
 */
export function DirectoryForm({ children }: { children: ReactNode }) {
  return (
    <Form
      action="/directory"
      className="flex flex-col gap-6"
      onChange={(event) => {
        const target = event.target as HTMLElement;
        if (target instanceof HTMLSelectElement || (target as HTMLInputElement).type === "checkbox")
          event.currentTarget.requestSubmit();
      }}
    >
      {children}
    </Form>
  );
}

/** The filters beside the results; on a phone they open from a button, like a sheet. */
export function FilterPanel({
  label,
  toggleLabel,
  children,
}: {
  label: string;
  toggleLabel: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="max-w-[280px] min-w-0 flex-[1_1_240px] max-[720px]:max-w-none max-[720px]:basis-full">
      <Button
        type="button"
        variant="secondary"
        className="min-[721px]:hidden"
        aria-expanded={open}
        aria-controls="dir-filter-panel"
        onClick={() => setOpen(!open)}
      >
        <SlidersHorizontal aria-hidden />
        {toggleLabel}
      </Button>
      <aside
        id="dir-filter-panel"
        className={cn(
          panel,
          "flex flex-col gap-5 p-5.5 max-[720px]:mt-2.5 max-[720px]:hidden max-[720px]:data-[open=true]:flex",
        )}
        data-open={open}
        aria-label={label}
      >
        {children}
      </aside>
    </div>
  );
}

/**
 * The results beside the filters. While a new search loads they fade back and say they are busy, and the filters stay
 * as they are: the page's skeleton is for arriving at the directory, not for changing a filter.
 */
export function DirectoryResults({ label, children }: { label: string; children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <section
      className="flex min-w-0 flex-[999_1_560px] flex-col gap-3.5 transition-opacity data-pending:opacity-50 data-pending:delay-150"
      aria-label={label}
      aria-busy={pending || undefined}
      data-pending={pending || undefined}
    >
      {children}
    </section>
  );
}
