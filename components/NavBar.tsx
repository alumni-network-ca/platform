"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { NavLink, NavModel } from "@/lib/auth/nav";
import { createClient } from "@/lib/supabase/client";
import { AccountMenu } from "./AccountMenu";
import { useLanguage } from "./LanguageProvider";

/** The link for the current page: the one whose activeOn path matches most closely. */
function currentLink(links: NavLink[], pathname: string) {
  let current: string | null = null;
  let length = -1;
  for (const link of links)
    for (const path of link.activeOn)
      if ((pathname === path || pathname.startsWith(`${path}/`)) && path.length > length) {
        current = link.key;
        length = path.length;
      }
  return current;
}

/** Draws the bar that components/Nav.tsx computed on the server (docs/design/nav-bar.md). */
export function NavBar({ model }: { model: NavModel }) {
  const pathname = usePathname();
  const router = useRouter();
  const { setLocale } = useLanguage();
  const current = currentLink(model.links, pathname);
  const { brand, pill } = model;

  function switchLanguage() {
    setLocale(model.language.switchTo);
    // Server pages, this bar included, read the language cookie.
    router.refresh();
  }

  async function signOut() {
    // Ends this address's session only: other schools and devices stay signed in (DEC-13).
    await createClient().auth.signOut({ scope: "local" });
    window.location.assign(model.signOutTo);
  }

  return (
    <header className={`topnav${model.theme === "platform" ? " topnavPlatform" : ""}`}>
      {/* The visible text is the accessible name (axe label-content-name-mismatch); the logo is decorative. */}
      <Link className="navBrand" href={brand.href}>
        {brand.logo ? (
          <Image src={brand.logo} alt="" width={42} height={42} className="navBrandTile" priority />
        ) : (
          <span
            className={`navBrandTile${model.theme === "platform" ? " navBrandMark" : ""}`}
            aria-hidden="true"
          >
            {brand.monogram}
          </span>
        )}
        <span className="navBrandText">
          <span className="navBrandName">{brand.name}</span>
          <span className="navBrandSub">{brand.tagline}</span>
        </span>
      </Link>

      {model.links.length > 0 && (
        <nav className="navLinks" aria-label={model.label}>
          {model.links.map((link) => {
            const content = (
              <>
                {link.label}
                {link.badge && (
                  <>
                    <span className="navBadge" aria-hidden="true">
                      {link.badge.count}
                    </span>
                    <span className="srOnly"> ({link.badge.label})</span>
                  </>
                )}
              </>
            );
            const ariaCurrent = link.key === current ? "page" : undefined;
            return link.href.startsWith("/") ? (
              <Link key={link.key} href={link.href} aria-current={ariaCurrent}>
                {content}
              </Link>
            ) : (
              <a key={link.key} href={link.href} aria-current={ariaCurrent}>
                {content}
              </a>
            );
          })}
        </nav>
      )}

      <div className="navRight">
        {model.account ? (
          <>
            {pill && (
              <span className={`rolePill rolePill-${pill.role}`}>
                <svg
                  aria-hidden="true"
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z" />
                </svg>
                {pill.label}
              </span>
            )}
            <AccountMenu
              account={model.account}
              platform={model.theme === "platform"}
              onAction={(action) => (action === "signOut" ? signOut() : switchLanguage())}
            />
          </>
        ) : (
          <>
            <button
              type="button"
              className="navLang"
              lang={model.language.switchTo}
              onClick={switchLanguage}
            >
              {model.language.code}
              <span className="srOnly"> · {model.language.name}</span>
            </button>
            {model.signIn && (
              <Link className="navSignIn" href={model.signIn.href}>
                {model.signIn.label}
              </Link>
            )}
          </>
        )}
      </div>
    </header>
  );
}
