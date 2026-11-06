# UI foundation: tokens and components

How screens are built from here on (ADR 0020). The canvas in `alumni-full-flow/` stays the reference for layout,
wording and flow. This page sets the shared values the canvas leaves inconsistent.

## Colours

Write colours as tokens, never as hex values: a literal colour shows Herzliah's palette to every school (ADR 0019).

| Tailwind name | Variable | Use |
|---|---|---|
| `primary` / `primary-hover` / `primary-soft` | `--accent`, `--accent-dark`, `--accent-pale` | Main buttons, links, selected states |
| `brand` / `brand-deep` | `--brand`, `--brand-deep` | Nav bar, banners, the dashboard hero |
| `foreground` | `--ink` | Body text |
| `subtle-foreground` | `--ink-soft` | Secondary text |
| `muted-foreground` | `--text-muted` | Hints, meta lines, table headers |
| `background` / `card` | `--paper`, `--paper-raised` | Page / cards |
| `border` / `border-subtle` / `border-strong` | `--line`, `--line-subtle`, `--line-strong` | Card edges / row dividers / secondary buttons |
| `input` | `--input-line` | Field borders (3:1 against white) |
| `accent` | `--surface-hover` | Hover background of ghost buttons and menu items (not the school accent) |
| `muted` | `--line-subtle` | Skeletons, neutral tags |
| `destructive`, `success`, `warning`, `info` (+ `-soft`) | `--danger`, `--good`, `--warn`, `--info` | States. Always with words, never colour alone |

## Corners

| Class | Size | Use |
|---|---|---|
| `rounded-sm` | 6px | Menu items, small tags inside a box |
| `rounded-md` | 8px | Buttons, inputs, selects, icon buttons |
| `rounded-lg` | 12px | Cards, panels, tables, popovers, banners |
| `rounded-xl` | 16px | Dialogs, the account menu, the sign-in card |
| `rounded-full` | — | Pills, badges, avatars, toggle chips |

A part nested in a padded box takes the box's radius minus the padding, rounded to the scale. A 12px card with 6px
padding holds 6px items, not 12px ones.

## Type

Inter, from `next/font`. The scale is `text-xs` 12, `sm` 13, `base` 14, `md` 15, `lg` 17, `xl` 20, `2xl` 24, `3xl` 28,
`4xl` 32, `5xl` 40 and `6xl` 48. Note that `text-base` is 14px, the app's body size, not Tailwind's 16px. Form fields
are 16px on phones so iOS doesn't zoom. Use `tabular-nums` for counts, stats and table columns.

## Buttons (`components/ui/button.tsx`)

| Variant | Use |
|---|---|
| `default` | The one primary action of a view |
| `secondary` | Other actions: white with a border |
| `ghost` | Low-emphasis actions in toolbars and menus |
| `destructive` / `destructive-outline` | Remove, revoke, suspend: after a confirmation |
| `inverse` | A button on a `brand` panel |
| `link` | An action that reads as text |

- Sizes: `sm` 36px, `default` 44px (the touch minimum), `lg` 48px, and `icon` / `icon-sm`.
- Corners are 8px and the weight is 600. A focus ring shows on keyboard focus, and the button sinks 1px when pressed.
- Use `asChild` to give a `<Link>` the button look.
- Pass `loading` while the server works. The button shows a spinner, sets `aria-busy` and ignores clicks. Keep the
  label: change it to the "Saving…" form when the canvas does.
- Never style a `<button>` or a link as a button by hand.

## Fields

- `Input`, `Textarea` and `NativeSelect` share one look: 44px tall, an 8px corner, an `input` border, and a 3px focus
  ring in the school's colour.
- Use `NativeSelect` rather than a custom listbox. It keeps form submission, submit-on-change and the phone's own
  picker.

## Loading and feedback

- Every page that reads data has a `loading.tsx` with a skeleton shaped like the page (`components/ui/skeleton.tsx`).
- A button that waits on the server shows `loading`.
- A destructive action asks for confirmation in an `AlertDialog`, never `window.confirm`.

## Motion

Colour changes take 150ms and overlays 200ms, with ease-out. Animate transform and opacity only.
`prefers-reduced-motion` turns animation off globally (`app/globals.css`).

## Icons

Use lucide-react at 16px (`size-4`) in buttons and 20px beside headings, with `aria-hidden` when a label is present.
Don't use text glyphs (← → ✓ ✕ ✉ ✦) as icons.
