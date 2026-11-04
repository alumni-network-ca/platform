// Each school's colours as CSS variables (ADR 0019). app/globals.css holds Herzliah's approved design as the default
// theme; a school whose branding sets other colours gets a palette derived from them, darkened or lightened where
// needed so text and controls keep WCAG AA contrast. Shared by server and client code.
import type { CSSProperties } from "react";
import type { Json } from "@/lib/database";
import { contrastRatio } from "@/lib/admin/contrast";

/** The default theme's colours, Herzliah's navy and burgundy (globals.css :root). */
export const DEFAULT_PRIMARY = "#0B2159";
export const DEFAULT_ACCENT = "#7B1E3D";
/** The default light accent on primary surfaces (globals.css --on-brand-accent). */
const DEFAULT_ON_BRAND_ACCENT = "#EAB6CE";

const WHITE = "#FFFFFF";
const BLACK = "#000000";
const PAPER = "#F7F7F6";
const HEX = /^#[0-9a-f]{6}$/i;

/** a moved toward b by t (0 to 1), channel by channel. */
export function mix(a: string, b: string, t: number) {
  const channel = (i: number) => {
    const from = parseInt(a.slice(i, i + 2), 16);
    const to = parseInt(b.slice(i, i + 2), 16);
    return Math.round(from + (to - from) * t)
      .toString(16)
      .padStart(2, "0");
  };
  return ("#" + channel(1) + channel(3) + channel(5)).toUpperCase();
}

/** The colour if it passes, else the nearest shade toward black or white that does. */
function nearest(colour: string, toward: string, passes: (shade: string) => boolean) {
  for (let step = 0; step <= 50; step++) {
    const shade = mix(colour, toward, step / 50);
    if (passes(shade)) return shade;
  }
  return toward;
}

/** The colour if it reaches the ratio against the background, else the nearest shade toward black or white that does. */
function readable(colour: string, background: string, ratio: number, toward: string) {
  return nearest(colour, toward, (shade) => (contrastRatio(shade, background) ?? 0) >= ratio);
}

/** The most white the nav bar lays over the primary colour behind white text (open account menu, active link). */
export const BAR_HIGHLIGHT = 0.14;

/** Light text (4.5:1) or a control border (3:1) on a surface: the surface mixed toward white. */
function onSurface(surface: string, white: number, ratio = 4.5) {
  return readable(mix(surface, WHITE, white), surface, ratio, WHITE);
}

/** A branding colour when it is a valid hex that differs from the default. */
function custom(branding: Record<string, Json | undefined>, key: string, fallback: string) {
  const value = branding[key];
  return typeof value === "string" && HEX.test(value) && value.toUpperCase() !== fallback
    ? value.toUpperCase()
    : null;
}

/**
 * The CSS variables that differ from the default theme for this branding, for the page's root element; undefined
 * when the school uses the default colours. The names are those of app/globals.css :root.
 */
export function schoolTheme(branding: Json | undefined): CSSProperties | undefined {
  const b = branding && typeof branding === "object" && !Array.isArray(branding) ? branding : {};
  const primary = custom(b, "primary_color", DEFAULT_PRIMARY);
  const accent = custom(b, "accent_color", DEFAULT_ACCENT);
  if (!primary && !accent) return undefined;

  // Surfaces (the nav bar, banners) carry white text, also under the bar's highlights. Body text stays near black:
  // Herzliah's navy is 15:1.
  const brand = primary
    ? nearest(
        primary,
        BLACK,
        (shade) => (contrastRatio(mix(shade, WHITE, BAR_HIGHLIGHT), WHITE) ?? 0) >= 4.5,
      )
    : DEFAULT_PRIMARY;
  const vars: Record<string, string> = {};
  if (primary) {
    const deep = mix(brand, BLACK, 0.22);
    Object.assign(vars, {
      "--brand": brand,
      "--brand-deep": deep,
      "--ink": readable(primary, PAPER, 12, BLACK),
      "--on-brand-soft": onSurface(brand, 0.83),
      "--on-brand-muted": onSurface(brand, 0.73),
      "--on-brand-faint": onSurface(brand, 0.65),
      "--on-brand-line": onSurface(brand, 0.4, 3),
      "--on-deep-soft": onSurface(deep, 0.84),
      "--on-deep-muted": onSurface(deep, 0.62),
    });
  }
  if (accent) {
    const soft = mix(accent, WHITE, 0.87);
    // Text and buttons in the accent sit on the page or its softest tint, and carry white text. Darker only helps.
    const main = readable(readable(accent, soft, 4.5, BLACK), PAPER, 4.5, BLACK);
    Object.assign(vars, {
      "--accent": main,
      "--accent-dark": mix(main, BLACK, 0.21),
      "--accent-soft": soft,
      "--accent-pale": mix(accent, WHITE, 0.94),
      "--accent-chip": mix(accent, WHITE, 0.91),
      "--accent-glow": mix(accent, WHITE, 0.93),
      "--accent-ring": readable(mix(main, WHITE, 0.25), WHITE, 3, BLACK),
    });
  }
  // Small accent-coloured text on a primary surface (the admin dashboard's hero).
  vars["--on-brand-accent"] = readable(
    accent ? mix(accent, WHITE, 0.6) : DEFAULT_ON_BRAND_ACCENT,
    brand,
    4.5,
    WHITE,
  );
  return vars as CSSProperties;
}
