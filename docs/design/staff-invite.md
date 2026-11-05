# Staff invitation — design spec

Source design: the **School admin** page of the **Alumni Full Flow** canvas, rows **A5 · Inviting a staff member**
and **A6 · Accepting the invitation and first sign-in**, plus the revised **A4.1 Staff and roles** and the
`invitee` role of the nav bar (Layout page, L0). The frames are in [`alumni-full-flow/`](alumni-full-flow/)
(`AdmStaff`, `StaffInvite*`, `Staff*`); index and routes in its [README](alumni-full-flow/README.md). Copy
layout and wording from the frames, not their code; names, addresses and dates in them are sample data. Copy
below is English; every string needs an FR entry in `lib/i18n.ts`.

The database rules stay the authority (ADR 0005, `staff_invitations`, the staff RPCs). Where this design needs
more than the database offers, §6 says so.

## 1. Invitation states

One invitation per open `(school, email)` pair (`staff_invitations_one_open_idx`). Its state is derived, never
stored:

| State | When | Admin sees (A4.1) | Invitee sees (A6) |
|---|---|---|---|
| open | not accepted, not revoked, `expires_at` in the future | "Sent" · "{sent} · expires {date}" · Resend, Copy link, Revoke | A6.1 or A6.4 |
| expired | not accepted, not revoked, `expires_at` passed | "Expired" · "{sent} · expired {date}" · Send a new invitation | A6.7 `expired` |
| revoked | `revoked_at` set | "Revoked" (greyed) · "Revoked by {name}" · no action | A6.7 `revoked` |
| accepted | `accepted_at` set | moves to the Team table | A6.7 `used` |
| unknown link | no row matches the token hash (typo, or replaced by a newer link) | — | A6.7 `invalid` |

Each new link replaces the previous one (`issue_staff_invitation_link`), so an old link reads as unknown.

Who does what (ADR 0005): only `school_admin` (`staff.manage`) sees `/admin/staff` and invites, at their own
school. Platform admins invite school admins and reviewers from the console (S1.3, `platform_invite_staff`) and
see the staff list there read-only; those invitees follow the same A6 screens. Anyone holding a link can open A6; only the session whose email matches can accept
(`accept_staff_invitation`).

## 2. Admin side

**A4.1 Staff** (`/admin/staff`)
- Title "Staff", intro "People at {School} who can manage the network.", and an **Invite a staff member** button
  (primary, top right, wraps under the title on phones) → `/admin/staff/invite`. No inline invite form.
- **Team** table: Person (name + email; "(you)"), Role, Status chip ("Active"), actions (Change role, Remove;
  the last school admin shows "Only admin — can't remove").
- **Invitations** table: Invited address + "Invited by {name}", Role, Status chip + date line, actions per §1.
  Footnote: "Resend emails a fresh link and restarts the 7 days; the previous link stops working. Accepted
  invitations move to Team."
- Keep the two role cards and the last-admin note at the bottom.

**A5.1 Invite a staff member** (`/admin/staff/invite`, `staff.manage`)
- "← Staff" back link, title "Invite a staff member", lead "We email them a link. They create a staff account or
  sign in, then accept."
- Email field "Their email address", hint "Only this address can accept. Use the one they'll sign in with."
- Role: a fieldset of two radio cards, Reviewer selected by default. Each card has a one-line summary and
  "can" / "can't" lists, worded as on the frame and matching `role_permissions`. Selected card: 2px `#7b1e3d`
  border, `#fdf6f9` background.
- Aside: "What they'll receive" (email subject, "works once, only for {email}, for 7 days") and "Before they get
  access".
- **Send invitation** → `invite_staff`, then back to `/admin/staff` with the A5.2 banner. Cancel → `/admin/staff`.
- Errors inline under the field: invalid email; this address is already on the team.

**A5.2 After sending** (`/admin/staff` with a one-time result)
- Email delivered (EML-01): green banner "Invitation emailed to {email} as {role}. The link works once, for that
  address only, until {date}." with **Copy link instead**.
- No email delivery (today): amber banner "Invitation ready for {email} as {role}. We couldn't email it. Copy the
  link and send it to them yourself." with a read-only link field and **Copy link**. Build this one now; switch
  to the green banner when EML-01 lands.
- Resend issues a new link (and, per §6, restarts the 7 days) and shows the same banner. Revoke asks to confirm.

**A5.3 Invitation email** (`staff_invitation` template, EML-01 / EML-03)
- Subject "{inviter_name} invited you to help run the {School} Alumni Network". Reply-to: the inviter.
- Body: chip "Staff invitation", heading "Join the {School} team as a {role}", one paragraph on what the role
  does, three steps (account, accept, two-factor), **Accept invitation** button, "This link works once, only for
  {email}, until {expires_on}", a fallback URL, "Not expecting this? You can ignore it." Footer: FR link.

## 3. Invitee side

All A6 pages use the signed-out auth layout of the November 1 screens (`.auth` / `.card`, eyebrow, progress
strip). Progress: **1 Your account · 2 Accept the invitation · 3 Two-factor sign-in** (step 3 hidden until
FND-11 ships).

**A6.1 Link opened, signed out** (`/staff/accept?token=…`)
- Left: eyebrow "Staff invitation · {School}", heading "{inviter} invited you to join the {School} team", lead
  with the role, a facts list (Role, Invited by, For, Link valid until) and the three steps.
- Right card: a two-option switch "I'm new here" / "I have an account".
  - New: the invited email (read-only) and **Create my staff account** → `/join?next=/staff/accept?token=…`.
  - Existing: email (read-only) + password + **Sign in and continue**, returning to `/staff/accept?token=…`.
- Notice: "Only {email} can accept this invitation. If you're signed in with another address, we'll ask you to
  switch."
- A token that isn't open renders A6.7 instead.

**A6.2 Create a staff account** (`/join` with the staff destination)
- Heading "Create your staff account"; lead names the inviter and role and says staff skip the alumni request.
- First name, Last name ("Other {School} staff see your name on the Staff page and in the audit log."), email
  read-only and pre-filled from the invitation, password, confirm. **Create my account** → A6.3.

**A6.3 Confirm your email** (`/join/verify`, staff wording)
- "Your invitation is waiting. After you confirm, you come straight back to the invitation from {inviter} to
  accept it." Resend; "Already confirmed? Continue to the invitation".

**A6.4 Accept** (`/staff/accept?token=…`, signed in)
- Heading "Join the {School} team as a {role}", "{inviter}, school admin, invited you on {date}."
- Facts: Signed in as {email} with a green "Matches the invitation" chip, Role, School. "You can" / "You can't"
  lists. Notice on personal data and the audit log.
- **Accept and continue** → `accept_staff_invitation` → `/admin` (A6.6). Then two-factor once FND-11 exists.
- "Not you? Sign out and use another account". "The invitation stays open until {date}."
- Signed in with a different email: render A6.7 `wrong_account` instead of the accept button.

**A6.5 Two-factor setup** (FND-11, not built yet)
- Drawn for the future: authenticator QR or key, 6-digit check, done. Recovery is a platform-admin reset
  (FND-11), so no backup codes.

**A6.6 First admin page** (`/admin`, right after accepting)
- One-time welcome above the dashboard: "Welcome to the team, {first name}", "You're a {role} at {School}.
  {inviter} added you on {date}.", Dismiss. Three start cards by permission (Approvals with count, Alumni,
  Audit log). Shown once, when arriving from the accept redirect.

**A6.7 When the link doesn't work** (`/staff/accept?token=…`)

| Reason | Chip | Heading | Action |
|---|---|---|---|
| `wrong_account` | Different account | This invitation is for another address | Sign out and switch account |
| `expired` | Expired | This invitation has expired | Ask {inviter} for a new invitation |
| `revoked` | Cancelled | This invitation was cancelled | Contact {inviter} |
| `used` | Already accepted | You've already joined the team | Sign in (or go to `/admin` if this account is the staff member) |
| `invalid` | Link not recognised | We can't open this invitation | Contact the alumni office |

`invalid` shows no school-specific invitation details.

## 4. Nav bar

New nav role `invitee` ([`nav-bar.md`](nav-bar.md) §1, §4): signed in, no active membership at this school, an
open invitation for the account's email (`my_staff_invitation`), no alumni request. No pill; status line
"Staff invitation · {role}"; menu Language, Sign out. The canvas draws a "Finish staff setup" item, but the
invitation link exists only in the email, so the menu doesn't link to it.

## 5. Accessibility and layout

- Role choice is a real `fieldset` with `legend` and radio inputs; the account switch on A6.1 uses buttons with
  `aria-pressed`. Banners use `role="status"`.
- Read-only email fields stay focusable and say why they can't be changed.
- Admin pages keep the existing admin shell; tables scroll inside their box on phones.

## 6. Database needs

What the design needed beyond the database, and where it stands:

1. **Done** · `staff_invitation_preview(p_token text)` (migration `20261104000100`, callable without a session):
   the state from §1 plus school, role, inviter name (the inviter's address when they have no name; none for a
   platform admin), invited email, sent and expiry dates. An unknown token returns only `invalid`. It never
   grants anything; the link already reaches only the invited address.
2. **Done** · Resend restarts the 7 days: `issue_staff_invitation_link` now sets `expires_at`. An expired
   invitation still gets no new link; "Send a new invitation" invites the same address and role again.
3. **Done** · Staff name: A6.2 stores the name in the account's auth metadata; `person_name` reads it after the
   profile and the request (`school_staff`, `audit_people`). Like those, it is self-entered.
4. **Open** · Email: delivery is EML-01; the template needs `inviter_name`, `role` and `expires_on` placeholders
   (`lib/admin/templates.ts`), and `first_name` can't be filled for an invitation. Until then A5.2 is the
   copy-link result on the invite page, so the token never travels in a URL.
5. **Open** · Two-factor: FND-11 (TOTP, `aal2` in `requireStaff` and the staff RPCs, audited platform-admin
   reset). Accepting leads straight to `/admin` until then.

`accept_staff_invitation`'s email check stays the real guard; the matching chip on A6.4 is only a hint.

## 7. Acceptance

- `/admin/staff` has one invite entry point, the button to `/admin/staff/invite`; reviewers still get 403.
- Each §1 state shows the listed admin actions; expired invitations offer Send a new invitation.
- Signed out, a valid link shows who invited you, the role, the address and the expiry before sign-in.
- New invitees create an account with the invited email pre-filled and return to accept after confirming.
- A different signed-in account sees `wrong_account` and can switch; expired, revoked, used and unknown links
  each show their A6.7 state.
- After accepting, the person lands on `/admin` with the welcome once.
- All strings exist in EN and FR; axe passes; pages work at phone width.
