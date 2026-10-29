# Nav bar — design spec

Source design: the "Layout" page of the **Alumni Full Flow** canvas (frames L0–L6). The markup in
[`nav-bar.reference.html`](nav-bar.reference.html) is a design mock (a canvas component, not React): copy its
look and structure, not its code. Copy below is English; every string needs an FR entry in `lib/i18n.ts`.

One component renders the top bar on **every** page. What it shows depends on one derived value, the
**nav role** of the signed-in person *at the school of the current address* (DEC-13).

## 1. Nav role

Derive it on the server from `getAccount()` (`lib/auth/account.ts`) and the same helpers as `homeFor()` in
`lib/auth/home.ts`. Never decide it in the client; pass it down as a prop.

| Nav role | When | Pill |
|---|---|---|
| `guest` | Not signed in | none |
| `applicant` | Signed in, no active membership; latest request is pending / needs_info (also rejected, withdrawn) | none |
| `alumnus` | Active `alumni` membership with an active profile (onboarding done or not) | none |
| `reviewer` | Active `reviewer` membership | **Reviewer** |
| `school_admin` | Active `school_admin` membership | **School admin** |
| `platform_admin` | Row in `platform_admins`, on the root domain console (`/console`) | **Platform admin** |

- Alumni and applicants never see a role pill.
- Staff who also have an active alumni profile at the same school ("staff who graduated") keep their staff
  pill and get the extra menu section in §4. Flag: `alsoAlumnus = staff && profile?.status === 'active'`.
- A platform admin on a school's address without a support grant is not staff there: they follow
  `homeFor()` (`/account/platform`). With an active grant, show the bar as `platform_admin` themed
  (§2) so it's obvious they are acting as support.

## 2. Bar layout

Left → right: **brand** · **primary links** · **right cluster** (role pill + avatar button).
Height ≈ 66px, padding `12px 32px`, `flex-wrap: wrap` so it stacks on phones. Sticky top, existing `.topnav`.

| Theme | Bar background | Brand | Sub-label |
|---|---|---|---|
| School (all roles except platform) | `--ink` `#0b2159` | School logo on a 42px white tile (r 10px, p 4px) + "{School} Alumni Network" | "Private · verified · connected" |
| Platform | `#15172b` | 42px `#4b2a8a` tile with "AN" + "Alumni Network" | "Platform console" |

Brand links to the person's home (`homeFor()`; console for platform admins).

Primary links (pill-shaped, 9px 14px, radius 999px; active = `rgba(255,255,255,.12)` bg, white, 700;
inactive = `#d2d7e4`, 500):

| Nav role | Links |
|---|---|
| guest, applicant | none |
| alumnus | Home · Directory |
| reviewer, school_admin | Admin (badge = pending sign-ups) · Directory |
| platform_admin | Schools · Support (badge = active grants) · Health |

Badge: min-width 20px, radius 999px, `#eab6ce` bg, `#0b2159` text, 11px/800.

Right cluster:
- **guest**: "FR" text link (language switch) + "Sign in" outlined button (`1px solid #6b7a9e`, radius 7px).
- **everyone else**: role pill (if any) + avatar button.

Role pill (12px/800, padding 6px 12px, radius 999px, small shield icon before the text):

| Role | Background | Text | Border |
|---|---|---|---|
| Reviewer | transparent | `#d6e2ff` | `1px solid #8fa6d6` |
| School admin | `#eab6ce` | `#0b2159` | none |
| Platform admin | `#7b5bc4` | `#ffffff` | none |

Avatar button: a real `<button>` with `aria-haspopup="menu"`, `aria-expanded`, `aria-label="Account menu for {name}"`.
Pill-shaped (padding 3px 8px 3px 3px), 34px initials circle + chevron (down when closed, up when open).
Closed: `1px solid rgba(255,255,255,.3)` border; open: white border + `rgba(255,255,255,.14)` bg.
Initials-circle colours: alumni `#eab6ce`, school staff `#c9d6f2`, platform `#d9cdf3`.

## 3. Dropdown

Anchored under the avatar: `top: 70px; right: 24px`, width 320px, white, `1px solid #e2e5ee`, radius 14px,
shadow `0 24px 60px -20px rgba(11,33,89,.4)`. `role="menu"`; items are links with `role="menuitem"`.
Closes on: click outside, Escape, choosing an item, route change. Focus moves into the menu on open and
back to the button on close; arrow keys move between items.

Structure:
1. **Header** (padding 18px, bg `#f7f7f6`, platform `#f4f0fc`): 46px avatar · name (15px/800) · email
   (13px, ellipsis) · one status line (12px/700, colour by meaning — green `#1b5e33`, amber `#7a4b00`,
   neutral `#3a4a70`, purple `#4b2a8a`).
2. **Sections** separated by `1px solid #eef0f4`, each padding 6px; optional section title (11px/800,
   uppercase, `#4a5575`).
3. **Items**: min-height 40px, padding 8px 12px, radius 8px, 14px/500 `#0b2159`; optional right-aligned
   meta chip (12px/700, radius 999px). Chip kinds: count (`#7b1e3d`/white), info (`#eef0f4`/`#3a4a70`),
   good (`#e3f3e8`/`#1b5e33`), warn (`#fff4dc`/`#7a4b00`). Destructive items: `#a1173b`, 700.
4. Last section is always **Sign out** (destructive style). Keep the existing behaviour:
   `signOut({ scope: "local" })` — this school's session only (DEC-13).

## 4. Menu items by role

Routes in `code` exist today or are planned in the backlog; use `#` placeholders where a page doesn't
exist yet and leave a TODO with the backlog key.

**alumnus** — status line "Class of {year} · Verified graduate" (green)
- My profile → `/me`
- Edit profile → `/onboarding` (or the profile editor)
- Who can see me → `/me` visibility section · chip = current visibility (good)
- *Account*: Email and sign-in → `/account/email` · Language (chip "English · Français") · Download my data (PUB-02 / Law 25)
- Contact the alumni office (mailto institution reply-to) · Privacy policy and terms (PUB-02)
- Sign out

**applicant** — status line "Request pending with {School}" (amber; use the real request state)
- My request → `/account/pending` (or the state page from `homeFor()`) · chip = state (warn)
- Edit my request → `/join`
- *Account*: Language
- Contact the alumni office · Withdraw my request (destructive; existing withdraw action)
- Sign out

**reviewer** — status line = school name
- *Admin*: Dashboard → `/admin` · Approvals → queue · chip = pending count (count) · Alumni → roster · chip "Read-only" (info) · Audit log
- *Account*: Two-factor and sign-in · chip "On" (good) · Language
- Sign out

**school_admin** — status line = school name
- *Admin*: Dashboard · Approvals (count chip) · Alumni · Staff · School settings
- *Account*: Two-factor and sign-in (chip "On") · Language
- Sign out

**school_admin or reviewer with `alsoAlumnus`** — status line "{School} · Class of {year}"; insert after *Admin*:
- *You are also an alumnus*: My alumni profile → `/me` · Browse as an alumnus → `/directory`

**platform_admin** — status line "All schools" (purple)
- *Console*: Schools (chip = count) · Support access (chip "{n} active", warn) · Platform health (chip "{n} alert(s)" when any, warn)
- *Open a school*: one row per school; chip "Grant · {time} left" (good) when a grant is active, else "Needs a grant" (info) and the link goes to Support access
- *Account*: Two-factor and sign-in
- Sign out

Only show what the role can actually do (ADR 0005 permissions): hide items whose permission is missing,
and let server route guards stay the real check.

## 5. Acceptance

- Each nav role renders exactly the links, pill and items above (unit test the role → menu mapping as a pure function, like `homeFor()`).
- No role pill for guest / applicant / alumnus.
- Menu is fully keyboard-usable; axe passes in the Playwright suite (`npm run test:e2e`).
- All strings exist in EN and FR.
- Works at phone width: bar wraps, menu stays inside the viewport (max-width `calc(100vw - 32px)`).
