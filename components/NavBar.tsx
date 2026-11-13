"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import landing from "@/app/site/landing.module.css";
import type { NavLink, NavModel } from "@/lib/auth/nav";
import { createClient } from "@/lib/supabase/client";
import { AccountMenu } from "./AccountMenu";
import { useLanguage } from "./LanguageProvider";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { onBar } from "./navStyles";
import { LinkPending } from "./LinkPending";

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

const PILL = {
  reviewer: "border border-on-brand-pill-line text-on-brand-pill",
  school_admin: "bg-pink text-foreground",
  platform_admin: "bg-platform-pill text-white",
} as const;

const navLink = cn(
  "relative flex items-center gap-2 rounded-full px-3.5 py-[9px] font-medium text-on-brand-soft hover:bg-white/8 hover:text-white aria-[current=page]:bg-white/12 aria-[current=page]:font-bold aria-[current=page]:text-white",
  onBar,
);

/** Draws the bar that components/Nav.tsx computed on the server (docs/design/nav-bar.md). */
export function NavBar({
  model,
  platformLandingLabel,
}: {
  model: NavModel;
  platformLandingLabel?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { setLocale } = useLanguage();
  const current = currentLink(model.links, pathname);
  const { brand, pill } = model;
  const landingTagline =
    pathname === "/" || pathname === "/site" ? platformLandingLabel : undefined;

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
    <header
      className={cn(
        "sticky top-0 z-[100] flex min-h-[66px] flex-wrap items-center justify-between gap-4 px-8 py-3 text-white shadow-[0_8px_24px_rgba(5,18,49,0.12)] max-[720px]:px-4",
        model.theme === "platform" ? "bg-platform" : "bg-brand",
        landingTagline && landing.platformHeader,
      )}
    >
      {/* The visible text is the accessible name (axe label-content-name-mismatch); the logo is decorative. */}
      <Link
        className={cn("flex items-center gap-[11px] rounded-md text-white", onBar)}
        href={landingTagline ? "/" : brand.href}
      >
        {brand.logo ? (
          <Image
            src={brand.logo}
            alt=""
            width={42}
            height={42}
            className="size-[42px] shrink-0 rounded-lg bg-white object-contain p-1"
            priority
          />
        ) : (
          !landingTagline && (
            <span
              className={cn(
                "grid size-[42px] shrink-0 place-items-center rounded-lg p-1 text-[13px] font-extrabold tracking-[0.04em]",
                model.theme === "platform"
                  ? "bg-platform-mark text-white"
                  : "bg-white text-foreground",
              )}
              aria-hidden="true"
            >
              {brand.monogram}
            </span>
          )
        )}
        <span className="flex flex-col gap-[3px]">
          <span className="text-base leading-tight font-bold">{brand.name}</span>
          <span className="text-[11px] leading-none tracking-[0.1em] text-on-brand-muted uppercase">
            {landingTagline ?? brand.tagline}
          </span>
        </span>
      </Link>

      {model.links.length > 0 && (
        <nav
          className="flex flex-wrap gap-1 text-base max-[720px]:order-3 max-[720px]:w-full"
          aria-label={model.label}
        >
          {model.links.map((link) => {
            const content = (
              <>
                {link.label}
                {link.badge && (
                  <>
                    <span
                      className="min-w-5 rounded-full bg-on-brand-accent px-1.5 py-px text-center text-[11px] font-extrabold text-foreground tabular-nums"
                      aria-hidden="true"
                    >
                      {link.badge.count}
                    </span>
                    <span className="sr-only"> ({link.badge.label})</span>
                  </>
                )}
              </>
            );
            const ariaCurrent = link.key === current ? "page" : undefined;
            return link.href.startsWith("/") ? (
              <Link key={link.key} className={navLink} href={link.href} aria-current={ariaCurrent}>
                {content}
                <LinkPending />
              </Link>
            ) : (
              <a key={link.key} className={navLink} href={link.href} aria-current={ariaCurrent}>
                {content}
              </a>
            );
          })}
        </nav>
      )}

      <div className="flex items-center gap-2.5 max-[800px]:ml-auto">
        {model.account ? (
          <>
            {pill && (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold tracking-[0.02em] whitespace-nowrap",
                  PILL[pill.role],
                )}
              >
                <Shield aria-hidden size={13} strokeWidth={2.4} />
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
              className={cn(
                "cursor-pointer rounded-full border-0 bg-transparent px-3 py-2 text-base text-on-brand-soft hover:text-white",
                onBar,
              )}
              lang={model.language.switchTo}
              onClick={switchLanguage}
            >
              {model.language.code}
              <span className="sr-only"> · {model.language.name}</span>
            </button>
            {!landingTagline && model.signIn && (
              <Link
                className={cn(
                  "rounded-md border border-on-brand-line px-4 py-[9px] text-base font-bold text-white hover:bg-white/8",
                  onBar,
                )}
                href={model.signIn.href}
              >
                {model.signIn.label}
              </Link>
            )}
            {model.join && (
              <Link
                className="rounded-md bg-primary px-[17px] py-2.5 text-base font-bold whitespace-nowrap text-white outline-none hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-white"
                href={model.join.href}
              >
                {model.join.label}
              </Link>
            )}
          </>
        )}
      </div>
    </header>
  );
}
