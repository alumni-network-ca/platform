"use client";

import Form from "next/form";
import { useState, type ReactNode } from "react";

/**
 * The directory's search and filters as one GET form (DIR-02): the URL holds every filter, so a search can be
 * shared and the back button works. Changing a select or an option submits at once; the search box submits on
 * Enter. next/form keeps it a client-side navigation.
 */
export function DirectoryForm({ children }: { children: ReactNode }) {
  return (
    <Form
      action="/directory"
      className="dirForm"
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
    <div className="dirFilters">
      <button
        type="button"
        className="dirFiltersToggle"
        aria-expanded={open}
        aria-controls="dir-filter-panel"
        onClick={() => setOpen(!open)}
      >
        {toggleLabel}
      </button>
      <aside id="dir-filter-panel" className="dirPanel" data-open={open} aria-label={label}>
        {children}
      </aside>
    </div>
  );
}
