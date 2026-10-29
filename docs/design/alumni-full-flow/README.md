# Design: Alumni Full Flow

Source: the "Alumni Full Flow" design canvas (claude.ai artifact `K7UANkXdF1Te9sEtciKNKf`), copied here on 2026-10-29 so the implementation can cite it. Each `*.dc.html` file is one screen, as drawn: static mock data, fixed names such as "Ruth Klein", and `/_blob/…` image links that only resolve inside the canvas. `canvas.json` is the canvas index: pages, screen titles and the notes below.

The canvas is the reference for layout, wording and flow. The database rules (ADR 0005, RLS, the RPCs) stay the authority on who may do what.

## Rules drawn on the canvas

- **School admin** sees every school admin page. **Reviewer** sees the dashboard, decides sign-ups, reads the roster, records and audit log; no record actions, exports, templates, staff or settings (ADR 0005).
- **Platform admins** (Gab, Noah) work at `alumninetwork.ca/console`. The console shows counts per school, never alumni personal data. To see a school's data they open a support grant: a reason and at most 8 hours. The school's admins see it in their audit log, highlighted.
- All admin and console pages require two-factor sign-in (FND-11).
- CSV import is not drawn; sign-up through `/join` is the only way in at launch (DEC-01).

## Layout (shared components)

The **Layout** page of the canvas holds components every screen reuses. Screens include them with `<dc-import name="NavBar" role="…">` instead of drawing their own bar.

| Component | Frames | Spec |
|---|---|---|
| **Built** · Nav bar with role pill and account menu (`NavBar`) | L0 component; L1–L6 one per role: alumnus, applicant, reviewer, school admin, school admin who is also an alumnus, platform admin | [`../nav-bar.md`](../nav-bar.md) |

Signed-out pages (Join, Code) use the `guest` role: FR and Sign in, no avatar.

## Screens → routes → backlog

"Ready" means the database functions exist and are tested; "new" names what the database still needs. **Built** marks screens that are implemented.

### Super admin (root domain)

| Screen | Route | Backlog | Database |
|---|---|---|---|
| **Built** · S1.1 Console: all schools (`SaSchools`) | `/console` | SA-01 | `platform_school_summaries()`, counts only |
| **Built** · S1.2 Create a school (`SaCreate`) | `/console/schools/new` | SA-01 | `platform_create_school` with branding (`clean_branding`) |
| **Built** except the checklist · S1.3 School setup: first admin, launch checklist (`SaSetup`) | `/console/schools/[slug]` | SA-01, SA-02, SA-05 | `platform_appoint_school_admin`, `issue_staff_invitation_link`, `revoke_staff_invitation`. "Open sign-ups" needs the "in setup" status (SA-05) |
| **Built** · S2.1 Support access (`SaSupport`) | `/console/support` | FND-13 (done), SA-01 | `platform_open_grant`, `platform_revoke_grant` |
| **Built** · S2.2 Suspend or offboard (`SaSuspend`) | `/console/schools/[slug]/status` | SA-01, SA-03 | `platform_set_school_status`. Offboarding waits for the retention job (DEC-08, SA-05) |
| S2.3 Platform health (`SaHealth`) | `/console/health` | SA-04 | needs job heartbeats (FND-17) and the email outbox worker (EML-01) |

### School admin (school address)

| Screen | Route | Backlog | Database |
|---|---|---|---|
| **Built shell and backed cards** · A1.1 Dashboard (`AdmDashboard`) | `/admin` | ADM-01, ADM-02 | ready (RLS counts). Overdue confirmations need FRS-04, bounces EML-05 |
| **Built** · A1.2 Approval queue (`AdmQueue`) | `/admin/approvals` | ADM-05 | ready (`access_requests`); match suggestions read unclaimed records |
| **Built** · A1.3 Review a request (`AdmReview`) | `/admin/approvals/[id]` | ADM-05 | `decide_access_request` (approve and link or create, needs info, reject) |
| **Built** · A2.1 Alumni roster (`AdmRoster`) | `/admin/alumni` | ADM-03 | ready; the freshness filter needs FRS-04, the email column EML-05 |
| **Built** · A2.2 Record and history (`AdmRecord`) | `/admin/alumni/[id]` | ADM-03 | ready (`alumni_private`, `audit_log`, `access_requests`) |
| A2.3 Suspend, archive, deceased (`AdmSuspend`) | `/admin/alumni/[id]/status` | ADM-04 | `set_profile_status` |
| A2.4 Resolve a duplicate (`AdmDuplicate`) | `/admin/approvals/[id]/duplicate` | ONB-04 | new |
| A3.1 Email templates (`AdmTemplates`) | `/admin/templates` | EML-03 | `save_email_template`, `approve_email_template` |
| A3.2 Freshness (`AdmFreshness`) | `/admin/freshness` | FRS-04 | needs FRS-02 |
| A3.3 Export (`AdmExport`) | `/admin/export` | EXP-01, EXP-02 | new |
| A4.1 Staff and roles (`AdmStaff`) | `/admin/staff` | ADM-06 | `invite_staff`, `change_staff_role`, `remove_staff`; new: staff names and emails, revoking an invitation |
| A4.2 School settings (`AdmSettings`) | `/admin/settings` | ADM-08 | `update_school_settings`; logo upload needs storage |
| A4.3 Audit log (`AdmAudit`) | `/admin/audit` | ADM-07 | ready; new: actor names |

### Alumni

| Screen | Route | Backlog |
|---|---|---|
| 1.1 School's invitation email (`Main`) | email | EML-02 |
| 1.2 Join, 1.3 Code, 1.4 Request (`Join`, `Code`, `Request`) | `/join`, `/login` | FND-09, FND-18, ONB-03 |
| 1.5 Pending, 1.6 Needs info (`Pending`, `NeedsInfo`) | `/account/pending`, `/account/needs-info` | ONB-06 |
| 1.7 Approval email (`Approved`) | email | EML-02 |
| 2.1–2.4 Onboarding (`OnbAbout`, `OnbCareer`, `OnbNetwork`, `OnbPublish`) | `/onboarding` | ONB-05, PRF-05 |
| 3.1 My profile (`Me`) | `/me` | PRF-02 |
| 3.2 Directory (`Directory`) | `/directory` | DIR-02 |
| 3.3 Profile and message (`Profile`) | `/profile/[id]` | DIR-03, CON-02 |
| 3.4 Relay email (`RecipientEmail`) | email | CON-02 |
