# 0009: Frontend stack: Tailwind + shadcn/ui, next-intl, Zod + react-hook-form

- **Status:** Accepted · **Date:** 2026-10-14 · **Requirements:** F9, QA3, accessibility in §3

## Decision

### Kept from the MVP

- Next.js (App Router, upgraded to the current stable major), React, TypeScript (strict) and Supabase.

### Styling and components

- **Tailwind CSS v4 + shadcn/ui** (Radix primitives) give accessible dialogs, menus, tables and forms with keyboard support.
- The approved Herzliah design (`DESIGN_REFERENCE_PREVIOUS_PREVIEW.html`) becomes the default theme.
- Per-institution colours and logo are injected as CSS variables from `institutions.branding`.

### Language

- **next-intl** without locale-prefixed URLs (the pages are private, so there's no SEO need).
- Locale resolution order: the user's saved preference, then the `NEXT_LOCALE` cookie, then `Accept-Language`, then the institution's default, then `en`. `<html lang>` follows the result.
- Messages are split by namespace (`messages/{en,fr}/<area>.json`), and CI fails on missing keys.
- User-entered content is never translated or altered.

### Validation

- **Zod** schemas are shared by forms (react-hook-form) and server actions, and produce localized error messages.

### Avatars

- Initials only. No photos at launch.
