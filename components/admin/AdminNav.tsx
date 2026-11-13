"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import type { adminSections } from "@/lib/admin/sections";
import { LinkPending } from "@/components/LinkPending";

/**
 * The admin menu: a column beside the page, and on a phone or narrow window a strip above it that scrolls sideways,
 * so the page starts at the top of the screen instead of under seven rows of links.
 */
export function AdminNav({
  sections,
  label,
}: {
  sections: (ReturnType<typeof adminSections>[number] & { label: string })[];
  label: string;
}) {
  const pathname = usePathname();
  const strip = useRef<HTMLElement>(null);
  const isCurrent = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  // In the strip, bring the current section into view (without scrolling the page).
  useEffect(() => {
    const nav = strip.current;
    const link = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !link || nav.scrollWidth <= nav.clientWidth) return;
    nav.scrollLeft = link.offsetLeft - (nav.clientWidth - link.offsetWidth) / 2;
  }, [pathname]);

  return (
    <nav
      ref={strip}
      className="flex w-[232px] shrink-0 grow-0 basis-[232px] flex-col gap-0.5 border-r border-border bg-card px-3 py-5 max-[800px]:w-full max-[800px]:basis-full max-[800px]:flex-row max-[800px]:gap-1 max-[800px]:overflow-x-auto max-[800px]:border-r-0 max-[800px]:border-b max-[800px]:px-4 max-[800px]:py-2"
      aria-label={label}
    >
      {sections.map((s) => (
        <Link
          key={s.key}
          className="relative flex shrink-0 items-center justify-between gap-2 rounded-md px-3 py-2.5 text-base font-medium whitespace-nowrap text-foreground outline-none hover:bg-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground aria-[current=page]:bg-primary-soft aria-[current=page]:font-bold"
          href={s.href}
          aria-current={isCurrent(s.href) ? "page" : undefined}
        >
          {s.label}
          {s.badge > 0 && (
            <span className="min-w-[22px] rounded-full bg-primary px-[7px] py-0.5 text-center text-xs font-bold text-primary-foreground tabular-nums">
              {s.badge}
            </span>
          )}
          <LinkPending className="bottom-0.5 text-primary" />
        </Link>
      ))}
    </nav>
  );
}
