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
- A radio or checkbox drawn as a card (`optionCard` in `components/profile/FormCard.tsx`) shows its choice with a
  second line of the school's colour inside the border, so nothing moves. A toggle chip whose label can wrap uses
  `rounded-xl`, not `rounded-full`, so two lines make a rounded box rather than a stretched pill.

## Page parts

The alumni pages (home, directory, `/me`, a profile, onboarding) build from `components/alumni/parts.tsx` and
`components/alumni/profile.tsx`: page frames and columns, the white `panel`, `Avatar`, `Tags`, `PersonCard` and
`textLink`. Their skeletons use the same classes, so a page and its skeleton cannot drift apart.

Sign-in, account creation, a request's status and a staff invitation build from `components/auth/parts.tsx`: one
card (`AuthCard`, 16px corners, as on the canvas's SignIn and Join), the step markers, `Callout` (a note with a line of
the school's colour down its side), `Facts` and `AbilityList`.

- Text links are in the school's colour (`primary`) and underline on hover, as on the canvas.
- A form's result is an `Alert` (`components/ui/alert.tsx`): `error` for what went wrong, `success`, `warning` or
  `info`. Errors are red for every school, never the school's colour.
- A clickable card changes its border and adds `shadow-sm` on hover. It never moves.

## Loading and feedback

- **Skeletons.** Every page you navigate to has its own `loading.tsx`, built from `components/skeletons/`.
  - A skeleton reuses its page's layout classes, so nothing moves when the content arrives.
  - The grey blocks (`components/ui/skeleton.tsx`) are hidden from screen readers. One `LoadingStatus` says "Loading…".
  - Give each page its own file: a parent's skeleton is not shown again when you move between its children. An
    index page goes in a route group, as in `app/admin/(overview)/`, so its skeleton does not wrap its siblings.
- **Status codes.** Once a skeleton streams, the response is a 200, whatever `notFound()` or `forbidden()` says next.
  A 403 or 404 that must reach the browser is decided in a `layout.tsx` above the `loading.tsx`, through a `cache()`d
  read the page shares: `app/admin/staff/layout.tsx`, `app/profile/[id]/layout.tsx`.
- **Prefetching.** In production a `<Link>` prefetches the next page's skeleton, so a click shows it at once. A link
  whose page checks access in a layout is not prefetched when there are many of them (`prefetch={false}` on the
  directory's profile cards): each prefetch would run that check.
- **Links.** `LinkPending` (`useLinkStatus`) draws a thin bar on a link whose navigation outlasts 150 ms.
- **Buttons.** A button that waits on the server shows `loading` (a spinner and `aria-busy`). In a form rendered by a
  server component, use `SubmitButton`, which reads `useFormStatus`. A form whose action then loads another page
  returns `leaveTo(url)` (`lib/leave.ts`), which keeps the button busy until that page loads.
- **Filters.** A GET form uses `next/form`. Changing a filter keeps the filters on screen and marks the results busy
  (`DirectoryResults`); the page skeleton is for arriving on a page.
- **Errors.** `not-found.tsx`, `forbidden.tsx` and `error.tsx` use `StatusPage`: what happened, what to do next. An
  error shows its reference (`digest`), never its message.
- **Confirmation.** An action that is hard to undo asks first in a `ConfirmDialog` (`components/ui/confirm-dialog.tsx`),
  never `window.confirm`. Its title is the question, its button repeats the action ("Remove"), and Cancel comes first.
  The one exception is the unsaved-changes prompt when leaving a form, which guards a navigation.
- **Empty lists.** Use `EmptyState` (`components/EmptyState.tsx`): an icon, one line on what is missing, an optional hint
  and the action that fills it.

## Motion

Colour changes take 150ms and overlays 200ms, with ease-out. Animate transform and opacity only.
`prefers-reduced-motion` turns animation off globally (`app/globals.css`).

## Icons

Use lucide-react at 16px (`size-4`) in buttons and 20px beside headings, with `aria-hidden` when a label is present.
Don't use text glyphs (← → ✓ ✕ ✉ ✦) as icons.
