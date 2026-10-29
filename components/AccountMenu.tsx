"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import type { NavAccount, NavItem } from "@/lib/auth/nav";

/**
 * The avatar button and the account menu (WAI-ARIA menu button pattern). Enter, Space or ArrowDown open it on
 * the first item and ArrowUp on the last; the arrows, Home and End move between items; Escape closes it and
 * focus returns to the button. Choosing an item, clicking outside, Tab and a page change close it too.
 */
export function AccountMenu({
  account,
  platform,
  onAction,
}: {
  account: NavAccount;
  platform: boolean;
  onAction: (action: NonNullable<NavItem["action"]>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [focusOn, setFocusOn] = useState<"first" | "last">("first");
  const pathname = usePathname();
  const [openedAt, setOpenedAt] = useState(pathname);
  const wrapper = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const id = useId();

  // A new page closes the menu (state adjusted during render, without an effect).
  if (pathname !== openedAt) {
    setOpenedAt(pathname);
    setOpen(false);
  }

  const items = () => [...(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];

  useEffect(() => {
    if (!open) return;
    const list = [...(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    (focusOn === "last" ? list.at(-1) : list[0])?.focus();
  }, [open, focusOn]);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  function openOn(item: "first" | "last") {
    setFocusOn(item);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    button.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target === button.current) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        openOn(event.key === "ArrowUp" ? "last" : "first");
      } else if (event.key === "Escape" && open) {
        event.preventDefault();
        setOpen(false);
      }
      return;
    }
    const list = items();
    const index = list.indexOf(document.activeElement as HTMLElement);
    const focus = (next: number) => {
      event.preventDefault();
      list[(next + list.length) % list.length]?.focus();
    };
    switch (event.key) {
      case "ArrowDown":
        return focus(index + 1);
      case "ArrowUp":
        return focus(index <= 0 ? list.length - 1 : index - 1);
      case "Home":
        return focus(0);
      case "End":
        return focus(list.length - 1);
      case "Escape":
        event.preventDefault();
        return close();
      case "Tab":
        // Focus moves on to the next control on the page.
        return setOpen(false);
    }
  }

  function choose(item: NavItem) {
    close();
    if (item.action) onAction(item.action);
  }

  return (
    <div className="acctWrap" ref={wrapper} onKeyDown={onKeyDown}>
      <button
        ref={button}
        type="button"
        className="avatarButton"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? `${id}menu` : undefined}
        onClick={() => (open ? setOpen(false) : openOn("first"))}
      >
        {/* Named by hidden text, not aria-label: axe's label-content-name-mismatch would otherwise want the
            initials in the name. */}
        <span className="srOnly">{account.buttonLabel}</span>
        <span className={`navAvatar navAvatar-${account.avatar}`} aria-hidden="true">
          {account.initials}
        </span>
        <svg
          aria-hidden="true"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={open ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"} />
        </svg>
      </button>

      {open && (
        <div className={`acctPanel${platform ? " acctPanelPlatform" : ""}`}>
          <div className="acctHead">
            <span
              className={`navAvatar navAvatarLarge navAvatar-${account.avatar}`}
              aria-hidden="true"
            >
              {account.initials}
            </span>
            <span className="acctWho">
              <span className="acctName">{account.name}</span>
              <span className="acctEmail">{account.email}</span>
              <span className={`acctStatus acctStatus-${account.status.tone}`}>
                {account.status.text}
              </span>
            </span>
          </div>
          <div ref={menu} id={`${id}menu`} role="menu" aria-label={account.menuLabel}>
            {account.sections.map((section) => (
              <div
                key={section.key}
                role="group"
                className="menuGroup"
                aria-labelledby={section.title ? `${id}${section.key}` : undefined}
              >
                {section.title && (
                  <div id={`${id}${section.key}`} className="menuTitle">
                    {section.title}
                  </div>
                )}
                {section.items.map((item) => (
                  <MenuItem key={item.key} item={item} onChoose={() => choose(item)} />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({ item, onChoose }: { item: NavItem; onChoose: () => void }) {
  const props = {
    role: "menuitem",
    tabIndex: -1,
    className: `menuItem${item.danger ? " menuItemDanger" : ""}`,
    onClick: onChoose,
  };
  const content = (
    <>
      <span>{item.label}</span>
      {item.chip && <span className={`menuChip menuChip-${item.chip.kind}`}>{item.chip.text}</span>}
    </>
  );
  if (item.action)
    return (
      <button type="button" {...props}>
        {content}
      </button>
    );
  // Links that leave this address (the console, another school, mailto:, "#" placeholders) are plain anchors.
  return item.href?.startsWith("/") ? (
    <Link href={item.href} {...props}>
      {content}
    </Link>
  ) : (
    <a href={item.href} {...props}>
      {content}
    </a>
  );
}
