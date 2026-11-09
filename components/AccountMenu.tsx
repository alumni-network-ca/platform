"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import type { NavAccount, NavItem } from "@/lib/auth/nav";
import { ChevronDown, ChevronUp } from "lucide-react";
import { menuChip, menuItem } from "@/components/ui/menu";
import { cn } from "@/lib/utils";
import { onBar } from "./navStyles";

const AVATAR = {
  alumni: "bg-pink",
  staff: "bg-avatar-staff",
  platform: "bg-platform-avatar",
} as const;
const STATUS = {
  good: "text-success",
  warn: "text-warning",
  neutral: "text-subtle-foreground",
  platform: "text-platform-mark",
} as const;
const avatar = "grid shrink-0 place-items-center rounded-full font-extrabold text-foreground";

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
    <div ref={wrapper} onKeyDown={onKeyDown}>
      <button
        ref={button}
        type="button"
        className={cn(
          "flex cursor-pointer items-center gap-1.5 rounded-full border border-white/30 bg-transparent py-[3px] pr-2 pl-[3px] text-white aria-expanded:border-white aria-expanded:bg-white/14",
          onBar,
        )}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? `${id}menu` : undefined}
        onClick={() => (open ? setOpen(false) : openOn("first"))}
      >
        {/* Named by hidden text, not aria-label: axe's label-content-name-mismatch would otherwise want the
            initials in the name. */}
        <span className="sr-only">{account.buttonLabel}</span>
        <span
          className={cn(avatar, "size-[34px] text-[13px]", AVATAR[account.avatar])}
          aria-hidden="true"
        >
          {account.initials}
        </span>
        {open ? (
          <ChevronUp aria-hidden size={14} strokeWidth={2.6} />
        ) : (
          <ChevronDown aria-hidden size={14} strokeWidth={2.6} />
        )}
      </button>

      {open && (
        // Anchored to the bar (the sticky header is its containing block), under the avatar.
        <div className="absolute top-[calc(100%+4px)] right-6 max-h-[calc(100vh-90px)] w-80 max-w-[calc(100vw-32px)] overflow-y-auto rounded-xl border border-border bg-card text-foreground shadow-lg max-[720px]:right-4">
          <div
            className={cn(
              "flex items-center gap-3 px-[18px] pt-[18px] pb-4",
              platform ? "bg-platform-soft" : "bg-background",
            )}
          >
            <span
              className={cn(avatar, "size-[46px] text-[16px]", AVATAR[account.avatar])}
              aria-hidden="true"
            >
              {account.initials}
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-md font-extrabold">{account.name}</span>
              <span className="truncate text-sm text-muted-foreground">{account.email}</span>
              <span className={cn("text-xs font-bold", STATUS[account.status.tone])}>
                {account.status.text}
              </span>
            </span>
          </div>
          <div ref={menu} id={`${id}menu`} role="menu" aria-label={account.menuLabel}>
            {account.sections.map((section) => (
              <div
                key={section.key}
                role="group"
                className="flex flex-col border-t border-border-subtle p-1.5"
                aria-labelledby={section.title ? `${id}${section.key}` : undefined}
              >
                {section.title && (
                  <div
                    id={`${id}${section.key}`}
                    className="px-3 pt-2 pb-1 text-[11px] font-extrabold tracking-[0.08em] text-muted-foreground uppercase"
                  >
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
    className: menuItem({ tone: item.danger ? "danger" : "default" }),
    onClick: onChoose,
  };
  const content = (
    <>
      <span>{item.label}</span>
      {item.chip && <span className={menuChip({ kind: item.chip.kind })}>{item.chip.text}</span>}
    </>
  );
  // Not built yet: stays in the arrow-key order (ARIA keeps disabled items focusable) but goes nowhere.
  if (item.soon)
    return (
      <div
        role="menuitem"
        tabIndex={-1}
        aria-disabled="true"
        className={menuItem({ tone: "soon" })}
      >
        {content}
      </div>
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
