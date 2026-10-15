"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Brand } from "./Brand";
import { AuthActions } from "./AuthActions";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useLanguage } from "./LanguageProvider";

export function Nav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const links = [
    ["/", t.nav.home],
    ["/directory", t.nav.directory],
  ] as const;

  return (
    <header className="topnav">
      <Brand />

      <nav className="navlinks" aria-label="Primary navigation">
        {links.map(([href, label]) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);

          return (
            <Link key={href} className={active ? "active" : ""} href={href}>
              {label}
            </Link>
          );
        })}
      </nav>

      <div
        style={{
          marginLeft: "auto",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <LanguageSwitcher />
        <AuthActions />
      </div>
    </header>
  );
}
