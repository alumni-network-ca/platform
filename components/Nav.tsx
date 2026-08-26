"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "./Brand";
import { AuthActions } from "./AuthActions";

const links = [
  ["/", "Home"],
  ["/directory", "Directory"],
] as const;

export function Nav() {
  const pathname = usePathname();
  return (
    <header className="topnav">
      <Brand />
      <nav className="navlinks" aria-label="Primary navigation">
        {links.map(([href, label]) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return <Link key={href} className={active ? "active" : ""} href={href}>{label}</Link>;
        })}
      </nav>
      <AuthActions />
    </header>
  );
}
