"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { adminSections } from "@/lib/admin/sections";
export function AdminNav({
  sections,
  label,
}: {
  sections: (ReturnType<typeof adminSections>[number] & { label: string })[];
  label: string;
}) {
  const pathname = usePathname();
  return (
    <nav className="adminNav" aria-label={label}>
      {sections.map((s) => (
        <Link
          key={s.key}
          href={s.href}
          aria-current={
            (s.href === "/admin" ? pathname === "/admin" : pathname.startsWith(s.href))
              ? "page"
              : undefined
          }
        >
          {s.label}
          {s.badge > 0 && <span className="adminBadge">{s.badge}</span>}
        </Link>
      ))}
    </nav>
  );
}
