"use client";

import { useEffect, useState, type RefObject } from "react";

/** Scroll movement under this many pixels is ignored (finger jitter, iOS rubber-banding). */
const THRESHOLD = 8;
/** The phone layout of the nav bar (matches its max-[720px] classes). */
const PHONE = "(max-width: 720px)";

/**
 * Whether the bar should be tucked away after the page scrolled from `prevY` to `y`.
 * Down past the bar's own height hides it; any real upward movement, or the top of the page, shows it.
 */
export function nextHidden(prevY: number, y: number, hidden: boolean, barHeight: number): boolean {
  if (y <= 0) return false;
  const delta = y - prevY;
  if (Math.abs(delta) < THRESHOLD) return hidden;
  if (delta < 0) return false;
  return y > barHeight;
}

/**
 * True while a phone-width page is scrolled down, so the bar can slide out of the way; it comes back as soon
 * as the user scrolls up. Never hides while focus or an open menu is inside the bar.
 */
export function useHideOnScroll(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
  resetKey: string,
) {
  const [hidden, setHidden] = useState(false);

  // A new page starts with the bar showing.
  const [seenKey, setSeenKey] = useState(resetKey);
  if (seenKey !== resetKey) {
    setSeenKey(resetKey);
    setHidden(false);
  }

  useEffect(() => {
    if (!enabled) return;
    const phone = window.matchMedia(PHONE);
    let lastY = window.scrollY;
    let frame = 0;

    function update() {
      frame = 0;
      const bar = ref.current;
      const y = window.scrollY;
      if (
        !bar ||
        !phone.matches ||
        bar.matches(":focus-within") ||
        bar.querySelector('[aria-expanded="true"]')
      ) {
        lastY = y;
        setHidden(false);
        return;
      }
      setHidden((current) => nextHidden(lastY, y, current, bar.offsetHeight));
      if (Math.abs(y - lastY) >= THRESHOLD || y <= 0) lastY = y;
    }

    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update);
    }

    function onChange() {
      if (!phone.matches) setHidden(false);
      lastY = window.scrollY;
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    phone.addEventListener("change", onChange);
    return () => {
      window.removeEventListener("scroll", onScroll);
      phone.removeEventListener("change", onChange);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ref, enabled]);

  return enabled && hidden;
}
