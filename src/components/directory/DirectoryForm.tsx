"use client";

import Form from "next/form";
import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { useLayoutEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { panel } from "@/components/alumni/parts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** What each field of the form shows, by its name: one value, or the checked values of a group of checkboxes. */
export type FormValues = Record<string, string | string[]>;

/**
 * Puts the form's fields back to `values`. The fields are uncontrolled (defaultValue, defaultChecked), and React only
 * applies those when a field mounts, so a link that changes the URL (a chip, Reset all, the back button) would
 * otherwise leave the old choices showing beside the new results. Fields not named in `values` are left alone.
 */
export function syncForm(form: HTMLFormElement, values: FormValues) {
  for (const el of Array.from(form.elements)) {
    if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement)) continue;
    if (!(el.name in values)) continue;
    const value = values[el.name];
    if (el instanceof HTMLInputElement && el.type === "checkbox")
      el.checked = (Array.isArray(value) ? value : [value]).includes(el.value);
    else if (el instanceof HTMLSelectElement || el.type === "search" || el.type === "text")
      el.value = (Array.isArray(value) ? value[0] : value) ?? "";
  }
}

/**
 * The directory's search and filters as one GET form (DIR-02): the URL holds every filter, so a search can be
 * shared and the back button works. Changing a select or an option submits at once; the search box submits on
 * Enter. next/form keeps it a client-side navigation. `values` are the filters the page read from the URL; the
 * fields follow them whenever they change, so the fields and the chips always agree.
 */
export function DirectoryForm({ values, children }: { values: FormValues; children: ReactNode }) {
  const ref = useRef<HTMLFormElement>(null);
  const key = JSON.stringify(values);
  useLayoutEffect(() => {
    if (ref.current) syncForm(ref.current, JSON.parse(key) as FormValues);
  }, [key]);
  return (
    <Form
      ref={ref}
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

/**
 * A link that clears every filter (Clear, Reset all). It also empties the fields at once: when the URL is already
 * /directory (say, words typed in the search box but not searched) the page does not change, so the fields would not
 * follow it.
 */
export function ResetLink({ onClick, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        onClick?.(event);
        const form = event.currentTarget.closest("form");
        if (form) syncForm(form, Object.fromEntries(fieldNames(form).map((name) => [name, ""])));
      }}
    />
  );
}

/** The names of the form's fields a reset empties: every select, checkbox and search box, but not the sort. */
const fieldNames = (form: HTMLFormElement) => [
  ...new Set(
    Array.from(form.elements)
      .filter(
        (el): el is HTMLInputElement | HTMLSelectElement =>
          el instanceof HTMLInputElement || el instanceof HTMLSelectElement,
      )
      .filter((el) => el.name && el.name !== "sort" && el.type !== "hidden")
      .map((el) => el.name),
  ),
];

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
