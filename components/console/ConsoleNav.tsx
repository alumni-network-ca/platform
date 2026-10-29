"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function ConsoleNav({ activeGrants }: { activeGrants: number }) {
  const pathname = usePathname();
  const items = [
    {
      href: "/console",
      label: "Schools",
      on: pathname === "/console" || pathname.startsWith("/console/schools"),
    },
    {
      href: "/console/support",
      label: "Support access",
      on: pathname.startsWith("/console/support"),
      badge: activeGrants,
    },
  ];
  return (
    <nav className="shellNav" aria-label="Console">
      {items.map((item) => (
        <Link key={item.href} href={item.href} aria-current={item.on ? "page" : undefined}>
          {item.label}
          {item.badge ? (
            <span className="shellBadge" aria-label={`${item.badge} open`}>
              {item.badge}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}
