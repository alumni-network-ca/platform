"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export function ContactLink({
  inquiry,
  className,
  children,
}: {
  inquiry: "demo" | "quote";
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      className={className}
      href={`/?inquiry=${inquiry}#contact`}
      scroll={false}
      onNavigate={() => {
        const contact = document.getElementById("contact");
        contact?.focus({ preventScroll: true });
        contact?.scrollIntoView({ block: "start" });
      }}
    >
      {children}
    </Link>
  );
}
