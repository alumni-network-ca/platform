# School posts — design spec

Backlog: EPIC-POST (POST-01 … POST-07), milestone Future. Screens: A7.1–A7.4 on the **School admin** page and
3.5–3.6 on the **Alumni** page of [`alumni-full-flow/`](alumni-full-flow/README.md). These screens were drawn in
this repository's copy on 2026-11-24; the cloud canvas does not have them yet.

Copy below is English; every string needs an FR entry.

## 1. What a post is

One feature, two kinds, one list:

| | News | Fundraising |
|---|---|---|
| Purpose | School news, stories, announcements | Point alumni to a campaign the school runs on its own site |
| Body | Rich text (headings, bold, italic, lists, links, quotes) | Plain description, 500 characters |
| Extra fields | — | Donation link (**https only**), goal note (free text, optional), end date (optional) |
| Cover image | Optional | Optional |
| Alumni action | Read more → article page | **Give on {host}** → leaves the site |

No money passes through the platform. A fundraising post is a signpost, never a payment form.

## 2. Who can do what (database rules win)

| Role | News and fundraising |
|---|---|
| School admin | Create, edit, schedule, publish, unpublish, archive (`posts.manage`) |
| Reviewer | Reads published posts like an alumnus; no Posts entry in the admin sidebar |
| Alumnus | Reads **published** posts of their own school only |
| Platform admin | Only with a support grant, like every other school page |

- The https rule for fundraising links is a **database constraint**, not only a form check.
- Drafts, scheduled and archived posts are invisible to alumni (RLS), not just hidden in the UI.

## 3. Status

`Draft` → `Scheduled` (publish time in the future) → `Published` → `Archived`. "Unpublish" returns a post to Draft.
A fundraising post past its end date stays published but shows an **Ended** chip and no button.

Chips: Draft `#eef0f4/#3a4a70` · Scheduled `#fff4dc/#7a4b00` · Published `#e3f3e8/#1b5e33` · Ended / Archived
`#eef0f4/#4a5575`.

## 4. Admin screens (A7)

- **A7.1 Posts list** (`/admin/posts`) — "Posts" sits in the admin sidebar between *Email templates* and
  *Freshness*. Tabs All · News · Fundraising with counts; a table of title, kind, status, date. **New post** opens
  a small chooser: *News* ("An update or story, with formatting and images") or *Fundraising* ("A short card that
  links to your school's donation page").
- **A7.2 News editor** (`/admin/posts/new?kind=news`, `/admin/posts/[id]`) — title, cover, toolbar
  (Heading, Bold, Italic, Bulleted list, Numbered list, Link, Quote), body. Right panel: status, *Publish now* or
  *Schedule* (date + time, school time zone), *Notify alumni by email* (off by default; POST-04).
  Buttons: Save draft · Preview · Publish / Schedule.
- **A7.3 Fundraising form** (`?kind=fundraising`) — title, description with a character counter, donation link
  with the hint "Must start with https://" and an inline error state, goal note, end date, cover. Same right panel.
- **A7.4 Preview** — the alumni card and page exactly as alumni will see them, in a frame with a banner
  "Preview — only staff can see this". Back to editing · Publish.

## 5. Alumni screens (3.5–3.6)

- **3.5 School posts** (`/posts`) — heading "News from {School}", filter chips All · News · Fundraising (a chip
  appears only if that kind has posts). Newest first.
  - News card: cover, "News" tag, date, title, two-line excerpt, *Read more*.
  - Fundraising card: cover, "Fundraising" tag, title, description, goal note, "Until {date}", then the leave-site
    note — *"You will leave {School} Alumni Network. Donations are handled by {School} on its own website."* — and
    a burgundy button **Give on {host} ↗**. The host is always printed. Opens a new tab.
- **3.6 Post** (`/posts/[id]`) — a news article: cover, title, date, body, "← All posts".
- **Hidden when empty**: no published posts → no "Posts" link in the nav bar and `/posts` is a 404. Never an empty
  page.

## 6. Outbound clicks

Decided by Gab, 2026-11-24: **record, don't show yet**.

- Each press of *Give on {host}* records one row (post, alumnus, time), at most one per alumnus, post and day.
- Recording must never block or delay the redirect.
- School admins see **no** click numbers in A7.1 for now. Showing aggregate counts (never who clicked) is POST-07
  and waits for Noah.
- The privacy policy line and the leave-site wording are checked under POST-06 (`needs-noah`).

## 7. Nav bar

Alumnus links become **Home · Directory · Posts** when the school has at least one published post (see
[`nav-bar.md`](nav-bar.md) §2). Staff who are also alumni get *School posts* in their "You are also an alumnus"
menu section under the same rule.
