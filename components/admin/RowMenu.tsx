"use client";
import {
  startTransition,
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { errorMessage, type ActionResult, type AdminCopy } from "@/lib/admin/forms";
import { createPortal } from "react-dom";
import { CopyLink } from "./CopyLink";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { menuItem, menuPanel } from "@/components/ui/menu";
import { cn } from "@/lib/utils";
import { Ellipsis, Loader2 } from "lucide-react";

export type RowMenuItem = {
  key: string;
  label: string;
  /** Hidden inputs sent with this item's form. */
  fields: Record<string, string>;
  danger?: boolean;
  confirm?: string;
};

const MENU_WIDTH = 220;
const panelHeight = (count: number) => count * 40 + 12;

/** Page coordinates under (or above) the button: the panel is rendered at the end of <body>. */
function placeFor(rect: DOMRect, below: boolean, count: number) {
  return {
    top: (below ? rect.bottom + 4 : rect.top - 4 - panelHeight(count)) + window.scrollY,
    left: Math.max(8, rect.right - MENU_WIDTH) + window.scrollX,
  };
}

/**
 * A row's actions behind a "⋯" button (WAI-ARIA menu button, as AccountMenu). Each item submits its own form to
 * `action`; the result (error, saved, invitation link) shows in the row under the button. The panel is
 * rendered at the end of <body> in page coordinates, so the table's horizontal scroll box can't clip it and it
 * stays under its button when the page scrolls (also on phones, where the page itself may scroll sideways).
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
  // An item that asks first, waiting on the confirmation dialog.
  const [confirming, setConfirming] = useState<RowMenuItem | null>(null);
  const [focusOn, setFocusOn] = useState<"first" | "last">("first");
  const [place, setPlace] = useState({ top: 0, left: 0 });
  const wrapper = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const below = useRef(true);
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
      const target = event.target as Node;
      if (!wrapper.current?.contains(target) && !menu.current?.contains(target)) setOpen(false);
    };
    // Scrolling the table's box (or smooth page scrolling after the tap) and resizing move the button: the
    // panel follows it rather than closing under the pointer.
    const follow = () => {
      const rect = button.current?.getBoundingClientRect();
      if (rect) setPlace(placeFor(rect, below.current, items.length));
    };
    document.addEventListener("pointerdown", outside);
    window.addEventListener("scroll", follow, true);
    window.addEventListener("resize", follow);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("scroll", follow, true);
      window.removeEventListener("resize", follow);
    };
  }, [open, items.length]);

  function openOn(item: "first" | "last") {
    const rect = button.current?.getBoundingClientRect();
    if (rect) {
      const height = panelHeight(items.length);
      below.current = rect.bottom + 4 + height <= window.innerHeight || rect.top - 4 - height < 0;
      setPlace(placeFor(rect, below.current, items.length));
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
        // The panel lives at the end of <body>: Tab returns to the button rather than leaving the page.
        event.preventDefault();
        return close();
    }
  }

  return (
    <div className="rowMenu" ref={wrapper} onKeyDown={onKeyDown}>
      <button
        ref={button}
        type="button"
        data-ui
        className="inline-flex size-9 cursor-pointer items-center justify-center rounded-md border border-transparent bg-transparent p-0 text-foreground outline-none hover:border-border hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-foreground disabled:cursor-progress disabled:opacity-60 aria-expanded:border-border aria-expanded:bg-accent"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? `${id}menu` : undefined}
        aria-label={label}
        disabled={pending}
        aria-busy={pending || undefined}
        onClick={() => (open ? setOpen(false) : openOn("first"))}
      >
        {pending ? (
          <Loader2 aria-hidden size={18} className="animate-spin" />
        ) : (
          <Ellipsis aria-hidden size={18} strokeWidth={3} />
        )}
      </button>
      {open &&
        createPortal(
          <div
            ref={menu}
            id={`${id}menu`}
            role="menu"
            aria-label={label}
            data-ui
            className={cn("absolute z-50", menuPanel)}
            style={{ top: place.top, left: place.left, width: MENU_WIDTH }}
          >
            {items.map((item) => (
              <form
                key={item.key}
                action={formAction}
                onSubmit={(e) => {
                  setOpen(false);
                  if (!item.confirm) return;
                  e.preventDefault();
                  setConfirming(item);
                }}
              >
                {Object.entries(item.fields).map(([name, value]) => (
                  <input key={name} type="hidden" name={name} value={value} />
                ))}
                <button
                  type="submit"
                  role="menuitem"
                  tabIndex={-1}
                  className={menuItem({ tone: item.danger ? "danger" : "default" })}
                >
                  {item.label}
                </button>
              </form>
            ))}
          </div>,
          document.body,
        )}
      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={(open) => !open && setConfirming(null)}
        title={confirming?.confirm ?? ""}
        confirmLabel={confirming?.label ?? ""}
        cancelLabel={t.cancel}
        destructive={confirming?.danger}
        returnFocus={button}
        onConfirm={() => {
          // The menu, and the item's form with it, closed when the dialog opened: send its fields directly.
          const form = new FormData();
          for (const [name, value] of Object.entries(confirming?.fields ?? {}))
            form.set(name, value);
          startTransition(() => formAction(form));
        }}
      />
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
            <Input readOnly value={state.link} onFocus={(e) => e.target.select()} />
          </label>
          <CopyLink value={state.link} label={t.copyLink} done={t.linkCopied} />
        </div>
      )}
    </div>
  );
}
