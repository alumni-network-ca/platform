import { describe, expect, it } from "vitest";
import { translations } from "@/lib/i18n";
import type { Origin } from "@/lib/tenant/address";
import type { AccountState } from "./home";
import { navModel, navRole, type NavInput, type NavModel } from "./nav";

const origin: Origin = {
  protocol: "https:",
  host: "herzliah.alumninetwork.ca",
  rootDomain: "alumninetwork.ca",
  isPreview: false,
};
const herzliah = {
  name: "Herzliah High School",
  slug: "herzliah",
  shortName: "Herzliah",
  logo: "/herzliah-logo.png",
  replyTo: null,
};
const none: AccountState = { membership: null, profile: null, request: null };
const member = (role: "school_admin" | "reviewer" | "alumni") => ({
  role,
  status: "active" as const,
});
const profile = (onboardingComplete = true) => ({ status: "active" as const, onboardingComplete });
const ruth = { name: "Ruth Klein", email: "rklein@herzliah.test", twoFactor: false };
const ADMIN = [
  "directory.use",
  "requests.read",
  "requests.decide",
  "records.read",
  "records.edit",
  "audit.read",
  "metrics.read",
  "staff.manage",
  "settings.manage",
];
const REVIEWER = [
  "directory.use",
  "requests.read",
  "requests.decide",
  "records.read",
  "audit.read",
];

const input = (overrides: Partial<NavInput>): NavInput => ({
  t: translations.en.nav,
  locale: "en",
  origin,
  now: new Date("2026-10-29T12:00:00Z"),
  school: herzliah,
  user: ruth,
  state: none,
  ...overrides,
});
const at = (overrides: Partial<NavInput>): NavModel => navModel(input(overrides));

// The menu as [section, item keys] pairs, and an item by key, for compact assertions.
const menu = (model: NavModel) =>
  model.account!.sections.map((s) => [s.key, s.items.map((i) => i.key)] as const);
const item = (model: NavModel, key: string) =>
  model.account!.sections.flatMap((s) => s.items).find((i) => i.key === key);
const links = (model: NavModel) => model.links.map((l) => [l.key, l.href] as const);

const platformAdmin = {
  grantHere: false,
  activeGrants: 1,
  schools: [
    { name: "Herzliah High School", slug: "herzliah", grantEndsAt: "2026-10-29T14:10:00Z" },
    { name: "Maple Ridge Academy", slug: "maple-ridge", grantEndsAt: null },
  ],
};

describe("navRole", () => {
  it.each<[string, Partial<NavInput>, string]>([
    ["signed out", { user: null, state: null }, "guest"],
    ["signed out on the root domain", { school: null, user: null, state: null }, "guest"],
    ["no account here on the root domain", { school: null, state: null }, "guest"],
    [
      "platform admin on the root domain",
      { school: null, state: null, platform: platformAdmin },
      "platform_admin",
    ],
    ["sign-up pending", { state: { ...none, request: "pending" } }, "applicant"],
    ["nothing at this school", { state: none }, "applicant"],
    [
      "suspended member",
      {
        state: {
          membership: { role: "alumni", status: "suspended" },
          profile: { status: "suspended", onboardingComplete: true },
          request: "approved",
        },
      },
      "applicant",
    ],
    [
      "alumnus",
      { state: { membership: member("alumni"), profile: profile(), request: "approved" } },
      "alumnus",
    ],
    [
      "alumnus still onboarding",
      { state: { membership: member("alumni"), profile: profile(false), request: "approved" } },
      "alumnus",
    ],
    ["reviewer", { state: { ...none, membership: member("reviewer") } }, "reviewer"],
    ["school admin", { state: { ...none, membership: member("school_admin") } }, "school_admin"],
    [
      "school admin who graduated",
      { state: { membership: member("school_admin"), profile: profile(), request: "approved" } },
      "school_admin",
    ],
    [
      "platform admin here without a grant",
      { state: { ...none, platformAdmin: true }, platform: null },
      "applicant",
    ],
    [
      "platform admin here with a grant",
      { state: { ...none, platformAdmin: true }, platform: { ...platformAdmin, grantHere: true } },
      "platform_admin",
    ],
  ])("%s → %s", (_, overrides, role) => {
    expect(navRole(input(overrides))).toBe(role);
    expect(at(overrides).role).toBe(role);
  });
});

describe("navModel", () => {
  it("guest: brand, language and sign-in only", () => {
    const model = at({ user: null, state: null });
    expect(model.theme).toBe("school");
    expect(model.brand).toMatchObject({
      name: "Herzliah Alumni Network",
      tagline: "Private · verified · connected",
      href: "/",
      logo: "/herzliah-logo.png",
    });
    expect(model.links).toEqual([]);
    expect(model.pill).toBeNull();
    expect(model.account).toBeNull();
    expect(model.signIn).toEqual({ href: "/login", label: "Sign in" });
    expect(model.language).toEqual({ switchTo: "fr", code: "FR", name: "Français" });
  });

  it("guest on the root domain: the platform brand", () => {
    const model = at({ school: null, user: null, state: null });
    expect(model.theme).toBe("platform");
    expect(model.brand).toMatchObject({
      name: "Alumni Network",
      tagline: "Platform console",
      monogram: "AN",
    });
    expect(model.signIn?.href).toBe("/login");
  });

  it("an account with no console access on the root domain can only sign out", () => {
    const model = at({ school: null, state: null });
    expect(model.signIn).toBeNull();
    expect(model.pill).toBeNull();
    expect(model.account?.status).toEqual({ text: "No access to the console", tone: "neutral" });
    expect(menu(model)).toEqual([["signOut", ["signOut"]]]);
    expect(model.signOutTo).toBe("/login");
  });

  describe("applicant", () => {
    it("pending: the request page, and withdrawing it", () => {
      const model = at({
        user: { ...ruth, name: "Dana Levy" },
        state: { ...none, request: "pending" },
      });
      expect(model.links).toEqual([]);
      expect(model.pill).toBeNull();
      expect(model.brand.href).toBe("/account/pending");
      expect(model.account).toMatchObject({
        name: "Dana Levy",
        initials: "DL",
        avatar: "alumni",
        status: { text: "Request pending with Herzliah", tone: "warn" },
        buttonLabel: "Account menu for Dana Levy",
      });
      expect(menu(model)).toEqual([
        ["request", ["myRequest"]],
        ["account", ["language"]],
        ["help", ["withdrawRequest"]],
        ["signOut", ["signOut"]],
      ]);
      expect(item(model, "myRequest")).toMatchObject({
        href: "/account/pending",
        chip: { text: "Pending", kind: "warn" },
      });
      expect(item(model, "withdrawRequest")).toMatchObject({ href: "#", danger: true });
      expect(item(model, "signOut")).toMatchObject({ action: "signOut", danger: true });
    });

    it.each<[AccountState["request"], string, string, string]>([
      ["needs_info", "/account/needs-info", "Needs info", "Herzliah needs more information"],
      ["rejected", "/account/rejected", "Declined", "Request declined by Herzliah"],
    ])("%s: the matching page and status", (request, href, chip, status) => {
      const model = at({ state: { ...none, request } });
      expect(item(model, "myRequest")).toMatchObject({ href, chip: { text: chip } });
      expect(model.account?.status.text).toBe(status);
      expect(item(model, "withdrawRequest") !== undefined).toBe(request === "needs_info");
    });

    it("suspended: the account page", () => {
      const model = at({
        state: {
          membership: { role: "alumni", status: "suspended" },
          profile: { status: "suspended", onboardingComplete: true },
          request: "approved",
        },
      });
      expect(menu(model)[0]).toEqual(["request", ["myAccount"]]);
      expect(item(model, "myAccount")).toMatchObject({
        href: "/account/suspended",
        chip: { text: "Suspended" },
      });
      expect(model.account?.status).toEqual({ text: "Access suspended at Herzliah", tone: "warn" });
    });

    it("no request yet: the sign-up form", () => {
      const model = at({ state: { ...none, request: "withdrawn" } });
      expect(menu(model)).toEqual([
        ["request", ["requestAccess"]],
        ["account", ["language"]],
        ["signOut", ["signOut"]],
      ]);
      expect(item(model, "requestAccess")?.href).toBe("/join");
      expect(model.account?.status.text).toBe("Not a member of Herzliah yet");
    });

    it("a platform admin without a grant: the support-access page", () => {
      const model = at({ state: { ...none, platformAdmin: true } });
      expect(model.theme).toBe("school");
      expect(menu(model)[0]).toEqual(["request", ["supportAccessHere", "requestAccess"]]);
      expect(item(model, "supportAccessHere")?.href).toBe("/account/platform");
      expect(model.account?.status.tone).toBe("platform");
    });

    it("contact the alumni office when its address is known", () => {
      const model = at({
        school: { ...herzliah, replyTo: "alumni@herzliah.test" },
        state: { ...none, request: "pending" },
      });
      expect(item(model, "contactOffice")?.href).toBe("mailto:alumni@herzliah.test");
    });
  });

  describe("alumnus", () => {
    const alumnus: Partial<NavInput> = {
      user: { name: "Dana Levy", email: "dana.levy@gmail.com", twoFactor: false },
      state: { membership: member("alumni"), profile: profile(), request: "approved" },
      profile: { gradYear: 2014, visibility: "members" },
      school: { ...herzliah, replyTo: "alumni@herzliah.test" },
    };

    it("Home and Directory, no pill, the profile and account menu", () => {
      const model = at(alumnus);
      expect(links(model)).toEqual([
        ["home", "/directory"],
        ["directory", "/directory"],
      ]);
      expect(model.links[0]?.activeOn).toEqual([]);
      expect(model.pill).toBeNull();
      expect(model.account).toMatchObject({
        avatar: "alumni",
        status: { text: "Class of 2014 · Verified graduate", tone: "good" },
      });
      expect(menu(model)).toEqual([
        ["profile", ["myProfile", "editProfile", "whoCanSeeMe"]],
        ["account", ["emailAndSignIn", "language", "downloadMyData"]],
        ["help", ["contactOffice", "privacyAndTerms"]],
        ["signOut", ["signOut"]],
      ]);
      expect(model.account?.sections[1]?.title).toBe("Account");
      expect(item(model, "whoCanSeeMe")).toMatchObject({
        href: "/me#visibility",
        chip: { text: "Verified alumni", kind: "good" },
      });
      expect(item(model, "language")).toMatchObject({
        action: "language",
        chip: { text: "English · Français", kind: "info" },
      });
      expect(item(model, "emailAndSignIn")?.href).toBe("/account/email");
      expect(item(model, "downloadMyData")?.href).toBe("#");
      expect(item(model, "privacyAndTerms")?.href).toBe("#");
    });

    it("still onboarding: no directory yet, and editing continues onboarding", () => {
      const model = at({
        ...alumnus,
        state: { membership: member("alumni"), profile: profile(false), request: "approved" },
        profile: { gradYear: 2014, visibility: "hidden" },
      });
      expect(links(model)).toEqual([["home", "/onboarding"]]);
      expect(item(model, "editProfile")?.href).toBe("/onboarding");
      expect(item(model, "whoCanSeeMe")?.chip).toEqual({ text: "Hidden", kind: "info" });
    });
  });

  describe("staff", () => {
    it("reviewer: Admin with the pending count, a read-only roster and the audit log", () => {
      const model = at({
        state: { ...none, membership: member("reviewer") },
        user: { name: "Avi Sasson", email: "asasson@herzliah.test", twoFactor: true },
        permissions: REVIEWER,
        pendingRequests: 7,
      });
      // /directory needs an alumni profile of one's own (canOpen), which this reviewer does not have.
      expect(links(model)).toEqual([["admin", "/admin"]]);
      expect(model.links[0]?.badge).toEqual({ count: 7, label: "7 pending" });
      expect(model.pill).toEqual({ role: "reviewer", label: "Reviewer" });
      expect(model.account).toMatchObject({
        avatar: "staff",
        status: { text: "Herzliah High School", tone: "neutral" },
      });
      expect(menu(model)).toEqual([
        ["admin", ["dashboard", "approvals", "alumni", "auditLog"]],
        ["account", ["twoFactor", "language"]],
        ["signOut", ["signOut"]],
      ]);
      expect(item(model, "dashboard")?.href).toBe("/admin");
      expect(item(model, "approvals")?.chip).toEqual({ text: "7", kind: "count" });
      expect(item(model, "alumni")?.chip).toEqual({ text: "Read-only", kind: "info" });
      expect(item(model, "twoFactor")?.chip).toEqual({ text: "On", kind: "good" });
    });

    it("school admin: every admin page its permissions open", () => {
      const model = at({
        state: { ...none, membership: member("school_admin") },
        permissions: ADMIN,
        pendingRequests: 0,
      });
      expect(model.links[0]?.badge).toBeUndefined();
      expect(model.pill).toEqual({ role: "school_admin", label: "School admin" });
      expect(menu(model)[0]).toEqual([
        "admin",
        ["dashboard", "approvals", "alumni", "staff", "schoolSettings", "auditLog"],
      ]);
      expect(item(model, "approvals")?.chip).toBeUndefined();
      expect(item(model, "alumni")?.chip).toBeUndefined();
      expect(item(model, "twoFactor")?.chip).toBeUndefined();
    });

    it("hides what the role's permissions do not allow", () => {
      const model = at({
        state: { ...none, membership: member("reviewer") },
        permissions: ["directory.use"],
        pendingRequests: 4,
      });
      expect(model.links[0]?.badge).toBeUndefined();
      expect(menu(model)[0]).toEqual(["admin", ["dashboard"]]);
    });

    it("staff who graduated: their class, the directory and an alumnus section", () => {
      const model = at({
        state: { membership: member("school_admin"), profile: profile(), request: "approved" },
        profile: { gradYear: 1998, visibility: "members" },
        permissions: ADMIN,
      });
      expect(links(model)).toEqual([
        ["admin", "/admin"],
        ["directory", "/directory"],
      ]);
      expect(model.account?.status.text).toBe("Herzliah High School · Class of 1998");
      expect(menu(model).map(([key]) => key)).toEqual([
        "admin",
        "alsoAlumnus",
        "account",
        "signOut",
      ]);
      expect(menu(model)[1]).toEqual(["alsoAlumnus", ["myAlumniProfile", "browseAsAlumnus"]]);
      expect(model.account?.sections[1]?.title).toBe("You are also an alumnus");
    });
  });

  describe("platform admin", () => {
    it("on the root domain: console links, every school and its grant", () => {
      const model = at({
        school: null,
        state: null,
        user: { name: null, email: "gab@alumninetwork.ca", twoFactor: false },
        platform: platformAdmin,
      });
      expect(model.theme).toBe("platform");
      expect(model.brand.href).toBe("/console");
      expect(links(model)).toEqual([
        ["schools", "/console"],
        ["support", "/console/support"],
        ["health", "#"],
      ]);
      expect(model.links[1]?.badge).toEqual({ count: 1, label: "1 active" });
      expect(model.pill).toEqual({ role: "platform_admin", label: "Platform admin" });
      expect(model.account).toMatchObject({
        name: "gab",
        initials: "GA",
        avatar: "platform",
        status: { text: "All schools", tone: "platform" },
      });
      expect(menu(model)).toEqual([
        ["console", ["schools", "supportAccess", "platformHealth"]],
        ["openSchool", ["school:herzliah", "school:maple-ridge"]],
        ["account", ["twoFactor"]],
        ["signOut", ["signOut"]],
      ]);
      expect(item(model, "schools")?.chip).toEqual({ text: "2", kind: "info" });
      expect(item(model, "supportAccess")?.chip).toEqual({ text: "1 active", kind: "warn" });
      expect(item(model, "school:herzliah")).toMatchObject({
        label: "Herzliah High School",
        href: "https://herzliah.alumninetwork.ca/",
        chip: { text: "Grant · 2 h left", kind: "good" },
      });
      expect(item(model, "school:maple-ridge")).toMatchObject({
        href: "/console/support?school=maple-ridge",
        chip: { text: "Needs a grant", kind: "info" },
      });
      expect(model.signOutTo).toBe("/login");
    });

    it("on a school's address with a grant: the platform bar, linking back to the console", () => {
      const model = at({
        state: { ...none, platformAdmin: true },
        platform: {
          ...platformAdmin,
          grantHere: true,
          schools: [
            { name: "Herzliah High School", slug: "herzliah", grantEndsAt: "2026-10-29T12:25:00Z" },
          ],
        },
      });
      expect(model.theme).toBe("platform");
      expect(model.brand.href).toBe("https://alumninetwork.ca/console");
      expect(links(model)).toEqual([
        ["schools", "https://alumninetwork.ca/console"],
        ["support", "https://alumninetwork.ca/console/support"],
        ["health", "#"],
      ]);
      expect(model.links.every((l) => l.activeOn.length === 0)).toBe(true);
      expect(item(model, "school:herzliah")?.chip?.text).toBe("Grant · 25 min left");
      expect(model.signOutTo).toBe("/");
    });
  });

  it("speaks French", () => {
    const model = at({
      t: translations.fr.nav,
      locale: "fr",
      state: { membership: member("alumni"), profile: profile(), request: "approved" },
      profile: { gradYear: 2014, visibility: "members" },
    });
    expect(model.brand.name).toBe("Réseau des anciens de Herzliah");
    expect(links(model).map(([key]) => key)).toEqual(["home", "directory"]);
    expect(model.links.map((l) => l.label)).toEqual(["Accueil", "Répertoire"]);
    expect(model.account?.status.text).toBe("Promotion 2014 · Diplômé(e) vérifié(e)");
    expect(item(model, "signOut")?.label).toBe("Se déconnecter");
    expect(model.language).toEqual({ switchTo: "en", code: "EN", name: "English" });
  });
});
