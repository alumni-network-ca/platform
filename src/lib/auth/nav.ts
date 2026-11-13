// What the nav bar shows each person at the current address (docs/design/nav-bar.md). Pure, so every role is
// unit-tested; components/Nav.tsx reads the inputs on the server and components/NavBar.tsx draws the result.
// Links into this school's pages go through canOpen(), so the bar never offers a page the guards refuse.
import type { Enums } from "@/lib/database";
import { format, type Locale, type translations } from "@/lib/i18n";
import { adminUrl, schoolUrl, type Origin } from "@/lib/tenant/address";
import {
  canOpen,
  hasActiveProfile,
  homeFor,
  isActiveMember,
  isStaff,
  type AccountState,
} from "./home";

export type NavRole =
  "guest" | "applicant" | "invitee" | "alumnus" | "reviewer" | "school_admin" | "platform_admin";
export type ChipKind = "count" | "info" | "good" | "warn" | "soon";
export type StatusTone = "good" | "warn" | "neutral" | "platform";

export type NavLink = {
  key: string;
  label: string;
  href: string;
  /** Paths under which the link shows as the current page. */
  activeOn: string[];
  badge?: { count: number; label: string };
};

export type NavItem = {
  key: string;
  label: string;
  /** A page, a mailto: address, or "#" while the page is not built (a TODO names its backlog key). */
  href?: string;
  /** An item that acts in the browser instead of opening a page. */
  action?: "language" | "signOut";
  chip?: { text: string; kind: ChipKind };
  danger?: boolean;
  /** The page is not built yet ("#"): shown with a "Coming soon" chip, and choosing it does nothing. */
  soon?: boolean;
};

export type NavSection = { key: string; title?: string; items: NavItem[] };

export type NavAccount = {
  name: string;
  email: string;
  initials: string;
  avatar: "alumni" | "staff" | "platform";
  status: { text: string; tone: StatusTone };
  buttonLabel: string;
  menuLabel: string;
  sections: NavSection[];
};

export type NavModel = {
  role: NavRole;
  theme: "school" | "platform";
  label: string;
  brand: { name: string; tagline: string; href: string; logo: string | null; monogram: string };
  links: NavLink[];
  pill: { role: "reviewer" | "school_admin" | "platform_admin"; label: string } | null;
  /** The signed-in person's menu; null for a signed-out visitor. */
  account: NavAccount | null;
  /** Shown to signed-out visitors only. */
  signIn: { href: string; label: string } | null;
  /** Public account creation at this school; never shown on the platform console. */
  join: { href: string; label: string } | null;
  language: { switchTo: Locale; code: string; name: string };
  /** Where signing out lands. */
  signOutTo: string;
};

export type NavStrings = (typeof translations)[Locale]["nav"];

export type NavInput = {
  t: NavStrings;
  locale: Locale;
  origin: Origin;
  now: Date;
  /** The school of this address; null on the root domain. */
  school: {
    name: string;
    slug: string;
    shortName: string;
    logo: string | null;
    /** The alumni office's address, when the person may read it. */
    replyTo: string | null;
  } | null;
  /** The signed-in person; name is null when no profile or request gives one. */
  user: { name: string | null; email: string; twoFactor: boolean } | null;
  /** Their state at this school (school addresses only). */
  state: AccountState | null;
  /** Their own profile at this school, when they have one. */
  profile?: { gradYear: number; visibility: Enums<"profile_visibility"> } | null;
  /** The permissions of their staff role at this school (role_permissions). */
  permissions?: string[];
  pendingRequests?: number;
  /** Only for a platform admin: on the root domain, or on a school's address. */
  platform?: {
    /** An open support grant at this school (school addresses only). */
    grantHere: boolean;
    schools: { name: string; slug: string; grantEndsAt: string | null }[];
    activeGrants: number;
  } | null;
  /** An open staff invitation here for the person's email (my_staff_invitation). */
  invitation?: { role: Enums<"member_role"> } | null;
};

/** The person's nav role at this address (docs/design/nav-bar.md §1). */
export function navRole({ school, user, state, platform, invitation }: NavInput): NavRole {
  if (!user) return "guest";
  // On the root domain only the console has a role; anyone else signed in there has none.
  if (!school) return platform ? "platform_admin" : "guest";
  // With a support grant the bar says so, whatever else the person is here (ADR 0005).
  if (platform?.grantHere) return "platform_admin";
  if (!state) return "applicant";
  if (isStaff(state)) return state.membership!.role === "reviewer" ? "reviewer" : "school_admin";
  if (hasActiveProfile(state)) return "alumnus";
  // Invited to the staff, with no membership or alumni request here yet (docs/design/staff-invite.md §4).
  if (invitation && !isActiveMember(state) && !state.request) return "invitee";
  return "applicant";
}

const initialsOf = (name: string) => {
  const words = name.split(/[\s.@_-]+/).filter(Boolean);
  const letters =
    words.length > 1 ? `${words[0]!.charAt(0)}${words.at(-1)!.charAt(0)}` : name.slice(0, 2);
  return letters.toUpperCase();
};

export function navModel(input: NavInput): NavModel {
  const { t, school, user, state, origin } = input;
  const role = navRole(input);
  const platformTheme = role === "platform_admin" || !school;
  // Console pages live on admin.<root>: relative there, absolute from a school's address.
  const consoleUrl = (path: string) => (school ? adminUrl(origin, path) : path);
  const opens = (href: string) => !state || !href.startsWith("/") || canOpen(state, href);
  const item = (key: keyof NavStrings, href: string, extra: Partial<NavItem> = {}): NavItem => ({
    key,
    label: t[key],
    href,
    ...extra,
    // A "#" placeholder says so instead of any chip it would carry once built.
    ...(href === "#" && { soon: true, chip: { text: t.comingSoon, kind: "soon" } }),
  });
  const keep = (items: (NavItem | false | null | undefined)[]) =>
    items.filter((i): i is NavItem => !!i && (!i.href || opens(i.href)));
  const section = (
    key: string,
    items: (NavItem | false | null | undefined)[],
    title?: string,
  ): NavSection => ({ key, title, items: keep(items) });
  const language: NavItem = {
    key: "language",
    label: t.language,
    action: "language",
    chip: { text: t.languages, kind: "info" },
  };
  const contact = school?.replyTo ? item("contactOffice", `mailto:${school.replyTo}`) : null;
  // TODO(PUB-02): the privacy policy and terms pages.
  const privacy = item("privacyAndTerms", "#");

  const brand = platformTheme
    ? {
        name: t.platformName,
        tagline: t.platformTagline,
        href: role === "platform_admin" ? consoleUrl("/") : "/",
        logo: null,
        monogram: "AN",
      }
    : {
        name: format(t.networkName, { school: school!.shortName }),
        tagline: t.schoolTagline,
        href: state ? homeFor(state) : "/",
        logo: school!.logo,
        monogram: initialsOf(school!.shortName),
      };

  let links: NavLink[] = [];
  let sections: NavSection[] = [];
  let status: NavAccount["status"] = { text: school?.name ?? t.noConsoleAccess, tone: "neutral" };

  if (role === "alumnus" && state) {
    const home = homeFor(state);
    links = [
      // The alumni home page once onboarding is done (DIR-06); until then, onboarding.
      { key: "home", label: t.home, href: home, activeOn: [home] },
      {
        key: "directory",
        label: t.directory,
        href: "/directory",
        activeOn: ["/directory", "/profile"],
      },
    ];
    if (input.profile) {
      status = { text: format(t.classOf, { year: input.profile.gradYear }), tone: "good" };
    }
    const visibility = input.profile?.visibility;
    sections = [
      section("profile", [
        item("myProfile", "/me"),
        item("editProfile", state.profile?.onboardingComplete ? "/me/edit/about" : "/onboarding"),
        item("whoCanSeeMe", "/me/visibility", {
          chip: visibility && {
            text: visibility === "members" ? t.visibleToMembers : t.hidden,
            kind: visibility === "members" ? "good" : "info",
          },
        }),
      ]),
      section(
        "account",
        [
          item("emailAndSignIn", "/account/email"),
          language,
          // The download is a POST from the "Your data" box on /me (each export is audited).
          item("downloadMyData", "/me#your-data"),
        ],
        t.accountSection,
      ),
      section("help", [contact, privacy]),
    ];
  }

  if (role === "applicant" && state && school) {
    const home = homeFor(state);
    const first: Record<string, [NavItem | null, NavAccount["status"]]> = {
      "/account/pending": [
        item("myRequest", home, { chip: { text: t.pending, kind: "warn" } }),
        { text: format(t.requestPending, { school: school.shortName }), tone: "warn" },
      ],
      "/account/needs-info": [
        item("myRequest", home, { chip: { text: t.needsInfo, kind: "warn" } }),
        { text: format(t.requestNeedsInfo, { school: school.shortName }), tone: "warn" },
      ],
      "/account/rejected": [
        item("myRequest", home, { chip: { text: t.declined, kind: "info" } }),
        { text: format(t.requestDeclined, { school: school.shortName }), tone: "neutral" },
      ],
      "/account/suspended": [
        item("myAccount", home, { chip: { text: t.suspended, kind: "warn" } }),
        { text: format(t.accessSuspended, { school: school.shortName }), tone: "warn" },
      ],
      "/account/platform": [
        item("supportAccessHere", home, { chip: { text: t.needsGrant, kind: "info" } }),
        { text: format(t.noAccessHere, { school: school.shortName }), tone: "platform" },
      ],
    };
    const [stateItem, stateStatus] = first[home] ?? [
      null,
      { text: format(t.notAMember, { school: school.shortName }), tone: "neutral" },
    ];
    status = stateStatus;
    const open = state.request === "pending" || state.request === "needs_info";
    sections = [
      section("request", [
        stateItem,
        open ? item("editRequest", "/join/edit") : item("requestAccess", "/join"),
      ]),
      section("account", [language], t.accountSection),
      section("help", [
        contact,
        // TODO(ONB-06): the confirmation step on the request page, calling withdraw_access_request.
        open && item("withdrawRequest", "#", { danger: true }),
      ]),
    ];
  }

  if (role === "invitee" && input.invitation) {
    // The invitation link lives only in the email, so the menu names the invitation instead of linking to it.
    status = {
      text: format(t.staffInvitation, {
        role: input.invitation.role === "reviewer" ? t.reviewer : t.schoolAdmin,
      }),
      tone: "warn",
    };
    sections = [section("account", [language], t.accountSection)];
  }

  if ((role === "reviewer" || role === "school_admin") && state && school) {
    const can = new Set(input.permissions ?? []);
    const pending = can.has("requests.read") ? (input.pendingRequests ?? 0) : 0;
    const alsoAlumnus = isStaff(state) && hasActiveProfile(state);
    links = [
      {
        key: "admin",
        label: t.admin,
        href: "/admin",
        activeOn: ["/admin"],
        badge: pending
          ? { count: pending, label: format(t.pendingBadge, { count: pending }) }
          : undefined,
      },
      {
        key: "directory",
        label: t.directory,
        href: "/directory",
        activeOn: ["/directory", "/profile"],
      },
    ];
    status = {
      text:
        alsoAlumnus && input.profile
          ? format(t.schoolAndClass, { school: school.name, year: input.profile.gradYear })
          : school.name,
      tone: "neutral",
    };
    // Each admin page shows only with the permission it needs (ADR 0005, role_permissions).
    sections = [
      section(
        "admin",
        [
          item("dashboard", "/admin"),
          can.has("requests.read") &&
            item("approvals", "/admin/approvals", {
              chip: pending ? { text: String(pending), kind: "count" } : undefined,
            }),
          can.has("records.read") &&
            item("alumni", "/admin/alumni", {
              chip: can.has("records.edit") ? undefined : { text: t.readOnly, kind: "info" },
            }),
          can.has("staff.manage") && item("staff", "/admin/staff"),
          can.has("settings.manage") && item("schoolSettings", "/admin/settings"),
          can.has("audit.read") && item("auditLog", "/admin/audit"),
        ],
        t.adminSection,
      ),
      alsoAlumnus &&
        section(
          "alsoAlumnus",
          [
            item("alumniHome", "/home"),
            item("myAlumniProfile", "/me"),
            item("browseAsAlumnus", "/directory"),
          ],
          t.alsoAlumnusSection,
        ),
      section(
        "account",
        [
          // TODO(FND-11): the two-factor page; until then the sign-in settings.
          item("twoFactor", "/account/email", {
            chip: user?.twoFactor ? { text: t.on, kind: "good" } : undefined,
          }),
          language,
        ],
        t.accountSection,
      ),
    ].filter((s): s is NavSection => !!s);
  }

  if (role === "platform_admin" && input.platform) {
    const { schools, activeGrants } = input.platform;
    links = [
      {
        key: "schools",
        label: t.schools,
        href: consoleUrl("/"),
        activeOn: school ? [] : ["/", "/schools"],
      },
      {
        key: "support",
        label: t.support,
        href: consoleUrl("/support"),
        activeOn: school ? [] : ["/support"],
        badge: activeGrants
          ? { count: activeGrants, label: format(t.activeBadge, { count: activeGrants }) }
          : undefined,
      },
      // TODO(SA-04): /health.
      { key: "health", label: t.health, href: "#", activeOn: [] },
    ];
    status = { text: t.allSchools, tone: "platform" };
    const timeLeft = (end: string) => {
      const minutes = Math.max(1, Math.ceil((Date.parse(end) - input.now.getTime()) / 60_000));
      return minutes >= 60
        ? format(t.hours, { count: Math.floor(minutes / 60) })
        : format(t.minutes, { count: minutes });
    };
    sections = [
      section(
        "console",
        [
          item("schools", consoleUrl("/"), {
            chip: { text: String(schools.length), kind: "info" },
          }),
          item("supportAccess", consoleUrl("/support"), {
            chip: activeGrants
              ? { text: format(t.activeBadge, { count: activeGrants }), kind: "warn" }
              : undefined,
          }),
          // TODO(SA-04): /health, with a chip counting its alerts.
          item("platformHealth", "#"),
        ],
        t.consoleSection,
      ),
      section(
        "openSchool",
        schools.map(({ name, slug, grantEndsAt }) => ({
          key: `school:${slug}`,
          label: name,
          ...(grantEndsAt
            ? {
                href: schoolUrl(origin, slug),
                chip: {
                  text: format(t.grantLeft, { time: timeLeft(grantEndsAt) }),
                  kind: "good" as const,
                },
              }
            : {
                href: consoleUrl(`/support?school=${slug}`),
                chip: { text: t.needsGrant, kind: "info" as const },
              }),
        })),
        t.openSchoolSection,
      ),
      section(
        "account",
        [
          // TODO(FND-11): the two-factor page.
          item("twoFactor", "#", {
            chip: user?.twoFactor ? { text: t.on, kind: "good" } : undefined,
          }),
        ],
        t.accountSection,
      ),
    ];
  }

  const signOut: NavSection = {
    key: "signOut",
    items: [{ key: "signOut", label: t.signOut, action: "signOut", danger: true }],
  };
  const name = user?.name || user?.email.split("@")[0] || "";
  const pills = {
    reviewer: t.reviewer,
    school_admin: t.schoolAdmin,
    platform_admin: t.platformAdmin,
  } as const;
  const pillRole =
    role === "reviewer" || role === "school_admin" || role === "platform_admin" ? role : null;

  return {
    role,
    theme: platformTheme ? "platform" : "school",
    label: t.main,
    brand,
    links: links.filter((link) => opens(link.href)),
    pill: pillRole && { role: pillRole, label: pills[pillRole] },
    account: user && {
      name,
      email: user.email,
      initials: initialsOf(name),
      avatar:
        role === "platform_admin"
          ? "platform"
          : role === "reviewer" || role === "school_admin" || role === "invitee"
            ? "staff"
            : "alumni",
      status,
      buttonLabel: format(t.accountButton, { name }),
      menuLabel: t.accountMenu,
      sections: [...sections.filter((s) => s.items.length), signOut],
    },
    signIn: user ? null : { href: "/login", label: t.signIn },
    join: !user && school ? { href: "/join", label: t.joinNow } : null,
    language: {
      switchTo: input.locale === "fr" ? "en" : "fr",
      code: t.otherLanguageCode,
      name: t.otherLanguage,
    },
    signOutTo: school ? "/" : "/login",
  };
}
