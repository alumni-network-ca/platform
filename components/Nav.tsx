"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "./Brand";
import { AuthActions } from "./AuthActions";

const links = [
  ["/", "Home"],
  ["/directory", "Directory"],
  ["/directory?mentoring=true", "Mentorship"],
  ["/admin", "Admin"],
] as const;

export function Nav() {
  const pathname = usePathname();
  return (
    <header className="topnav">
      <Brand />
      <nav className="navlinks" aria-label="Primary navigation">
        {links.map(([href, label]) => {
          const base = href.split("?")[0];
          const active = base === "/" ? pathname === "/" : pathname.startsWith(base);
          return <Link key={href} className={active ? "active" : ""} href={href}>{label}</Link>;
        })}
      </nav>
      <AuthActions />
    </header>
  );
}
