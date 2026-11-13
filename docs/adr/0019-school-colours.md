# 0019: School colours applied as CSS variables

- **Status:** Accepted · **Date:** 2026-11-04 · **Related:** FND-02, [0009](0009-frontend-stack.md), [0018](0018-school-config-cache.md)

## Context

Schools store a primary and an accent colour in `institutions.branding` (`#RRGGBB`, checked by `clean_branding()`),
but every page showed Herzliah's navy and burgundy: `src/app/globals.css` held them as about 60 literal values beside a
few variables. ADR 0009 already says each school's colours are injected as CSS variables.

A school's colours can't be used unchanged everywhere. Maimonide's accent, `#21BBED`, is 2.2:1 against white, and
the design uses the primary colour both behind white text (the nav bar) and as the body text colour.

## Decision

- **Herzliah's approved design is the default theme.** `:root` in `globals.css` keeps its exact values, named by
  role: `--brand` (surfaces such as the nav bar and banners), `--ink` (text), `--accent` and its shades (`-dark`,
  `-soft`, `-pale`, `-chip`, `-glow`, `-ring`), and `--on-brand-*` / `--on-deep-*` for light text on the primary colour.
- **A school with other colours gets a derived palette** from `schoolTheme()` in `src/lib/theme.ts`, which the root layout
  sets as inline variables on `<html>`. It is rendered on the server from the cached config (ADR 0018), so pages never
  flash the default colours. A school that sets no colours, or Herzliah's, gets no variables: its pages are unchanged.
- **Contrast decides the shades (WCAG AA).** Each colour is used as the school set it when it is readable, otherwise
  moved toward black or white just enough:
  - `--brand`: at least 4.5:1 behind white text, also under the nav bar's white highlights (active link, open menu).
  - `--ink`: at least 12:1 on the page, so long text stays near black (Herzliah's navy is 15:1).
  - `--accent`: at least 4.5:1 on white, on the page and on its own tints. The tints keep the original colour.
  - Light text on the primary colour: at least 4.5:1. Borders and focus rings: at least 3:1.
- **Not themed:** status colours (danger reds, success greens, warning ambers), the role colours of the nav-bar spec
  (alumni pink, staff blue, platform purple), neutral greys, and the root site and console, which have no school and
  use the default theme.

## Consequences

- Changing a school's colours restyles its pages without a code change, once its config cache refreshes (ADR 0018).
- A school's colour may be shown darker than stored. The admin settings page still reports each stored colour's
  contrast against white.
- New CSS must use the variables for brand colours: a literal navy or burgundy shows Herzliah's colours to every school.
