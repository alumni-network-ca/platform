# 0020: Moving to Tailwind and shadcn/ui one screen at a time

- **Status:** Accepted, completed 2026-11-12 (#88) · **Date:** 2026-11-06 · **Related:** FND-02, [0009](0009-frontend-stack.md), [0019](0019-school-colours.md)

## Context

ADR 0009 chose Tailwind CSS v4 and shadcn/ui, but every screen was built with hand-written CSS: one 3,779-line
`app/globals.css`. It has no shared scale: 13 corner radii, 28 font sizes, 7 shadows and about 120 literal colours.
Buttons, inputs and loading states differ from page to page. Rewriting every screen at once would block other work
and risk regressions just before the December pilot. Turning Tailwind on is not free either: its preflight resets
margins, headings, lists and form controls on every element, and the existing screens depend on the browser's
defaults.

## Decision

- **Cascade layers keep the old and new styles apart.** `app/globals.css` declares
  `@layer theme, base, compat, legacy, components, utilities` and loads the old stylesheet, now
  `app/styles/legacy.css`, into the `legacy` layer. Later layers win whatever the selector's specificity, so a
  Tailwind class always beats a legacy rule, and a legacy rule beats preflight.
- **A `compat` layer undoes preflight outside components/ui.** Every shadcn part carries `data-slot`. Outside those
  parts, `compat` sets the properties that preflight touches back to the browser's values (`revert`). The legacy
  screens therefore render as before, and components get the reset they expect. It reverts named properties only:
  `all: revert` would also drop SVG `fill`/`stroke` and image `width`/`height` attributes, which browsers treat as
  author styles.
- **A rebuilt screen opts out of `compat` with `data-ui`.** Its root element carries `data-ui`, which `compat` skips
  along with everything inside it. The screen then renders now as it will once `compat` is gone, so its screenshots
  check the final result and deleting `compat` later changes nothing there.
- **One set of tokens for both.** The school variables of ADR 0019 stay the source (`--brand`, `--accent`, `--ink`…).
  `@theme inline` gives them Tailwind names, so a school's colours reach every class.
  - `primary` is the action colour: `--accent`, which is burgundy for Herzliah.
  - `brand` is the nav bar's colour.
  - shadcn's `accent` stays its neutral hover surface. It never redefines our `--accent`.
- **One scale** for corners (6 / 8 / 12 / 16px and full), type (12 to 48px), shadows (xs to xl) and motion (150ms
  for colour changes, 200ms for overlays), described in [docs/design/ui-foundation.md](../design/ui-foundation.md).
  `legacy.css` uses the same variables, so screens that are not yet rebuilt follow the scale too.
- **Order of work.**
  - First the foundation: tokens, the components in `components/ui`, and every button and text field.
  - Then loading, pending and error states.
  - Then each area's screens, one pull request per area, deleting their rules from `legacy.css` as they move.
  - `compat` and `legacy.css` are deleted together, when the last screen has moved.
- **Icons** come from lucide-react, the icon set shadcn uses. Text glyphs (← → ✓ ✕ ✉ ✦) are not used as icons.

## Consequences

- Screens move one at a time without visual regressions. The before/after screenshot capture checks each step.
- Until the end, there are two ways to style a screen. New and rebuilt screens use Tailwind classes and
  components/ui. A change to a screen not yet rebuilt may still edit `legacy.css`.
- A legacy class whose name matches a Tailwind utility (such as `.table`) is overridden by that utility. Avoid such
  names; none is in use today.
- shadcn components are copied into `components/ui` and edited to match the design. `npx shadcn add` output must be
  adapted to the token names and radius scale before it is committed.

## Outcome (2026-11-12)

Every screen now uses Tailwind and components/ui. `app/styles/legacy.css`, the `compat` layer and the `data-ui`
marker are gone, and preflight applies everywhere. The base layer of `app/globals.css` keeps what the old stylesheet
set on the page itself: the background, text colour, font and smooth scrolling. The shared pieces are listed in
[docs/design/ui-foundation.md](../design/ui-foundation.md).
