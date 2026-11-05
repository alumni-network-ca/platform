"use client";
import { useActionState, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { errorMessage, type ActionResult, type AdminCopy } from "@/lib/admin/forms";
import { CopyLink } from "./CopyLink";

export type RowMenuItem = {
  key: string;
  label: string;
  /** Hidden inputs sent with this item's form. */
  fields: Record<string, string>;
  danger?: boolean;
  confirm?: string;
};

const MENU_WIDTH = 220;

/**
 * A row's actions behind a "⋯" button (WAI-ARIA menu button, as AccountMenu). Each item submits its own form to
 * `action`; the result (error, saved, invitation link) shows in the row under the button. The panel is
 * positioned against the viewport so the table's horizontal scroll box doesn't clip it.
 */
export function RowMenu({
  action,
  items,
  label,
  t,
}: {
  action: (state: ActionResult, form: FormData) => Promise<ActionResult>;
  items: RowMenuItem[];
  /** Accessible name of the button, e.g. "Actions for avi@school.test". */
  label: string;
  t: AdminCopy;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  const [open, setOpen] = useState(false);
  const [focusOn, setFocusOn] = useState<"first" | "last">("first");
  const [place, setPlace] = useState({ top: 0, left: 0 });
  const wrapper = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const id = useId();

  const list = () => [...(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];

  useEffect(() => {
    if (!open) return;
    const all = [...(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    (focusOn === "last" ? all.at(-1) : all[0])?.focus();
  }, [open, focusOn]);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    // A fixed panel would drift from its button: scrolling or resizing closes it instead.
    const drift = (event: Event) => {
      if (!menu.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    window.addEventListener("scroll", drift, true);
    window.addEventListener("resize", drift);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("scroll", drift, true);
      window.removeEventListener("resize", drift);
    };
  }, [open]);

  function openOn(item: "first" | "last") {
    const rect = button.current?.getBoundingClientRect();
    if (rect) {
      const height = items.length * 40 + 12;
      const below = rect.bottom + 4 + height <= window.innerHeight;
      setPlace({
        top: below ? rect.bottom + 4 : Math.max(8, rect.top - 4 - height),
        left: Math.max(8, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8)),
      });
    }
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
    const all = list();
    const index = all.indexOf(document.activeElement as HTMLElement);
    const focus = (next: number) => {
      event.preventDefault();
      all[(next + all.length) % all.length]?.focus();
    };
    switch (event.key) {
      case "ArrowDown":
        return focus(index + 1);
      case "ArrowUp":
        return focus(index <= 0 ? all.length - 1 : index - 1);
      case "Home":
        return focus(0);
      case "End":
        return focus(all.length - 1);
      case "Escape":
        event.preventDefault();
        return close();
      case "Tab":
        return setOpen(false);
    }
  }

  return (
    <div className="rowMenu" ref={wrapper} onKeyDown={onKeyDown}>
      <button
        ref={button}
        type="button"
        className="rowMenuButton"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? `${id}menu` : undefined}
        aria-label={label}
        disabled={pending}
        onClick={() => (open ? setOpen(false) : openOn("first"))}
      >
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </button>
      {open && (
        <div
          ref={menu}
          id={`${id}menu`}
          role="menu"
          aria-label={label}
          className="rowMenuPanel"
          style={{ top: place.top, left: place.left, width: MENU_WIDTH }}
        >
          {items.map((item) => (
            <form
              key={item.key}
              action={formAction}
              onSubmit={(e) => {
                if (item.confirm && !window.confirm(item.confirm)) {
                  e.preventDefault();
                  return;
                }
                setOpen(false);
              }}
            >
              {Object.entries(item.fields).map(([name, value]) => (
                <input key={name} type="hidden" name={name} value={value} />
              ))}
              <button
                type="submit"
                role="menuitem"
                tabIndex={-1}
                className={`menuItem${item.danger ? " menuItemDanger" : ""}`}
              >
                {item.label}
              </button>
            </form>
          ))}
        </div>
      )}
      {state.error && (
        <p role="alert" className="notice rowMenuNotice">
          {errorMessage(state.error, t)}
        </p>
      )}
      {state.saved && !state.link && (
        <p role="status" className="notice noticeGood rowMenuNotice">
          {t.saved}
        </p>
      )}
      {state.link && (
        <div className="linkRow rowMenuLink">
          <label className="field">
            {t.invitationLink}
            <input
              className="input"
              readOnly
              value={state.link}
              onFocus={(e) => e.target.select()}
            />
          </label>
          <CopyLink value={state.link} label={t.copyLink} done={t.linkCopied} />
        </div>
      )}
    </div>
  );
}
