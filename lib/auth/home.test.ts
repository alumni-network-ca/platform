import { describe, expect, it } from "vitest";
import { canOpen, homeFor, type AccountState } from "./home";
import { safeNext } from "./next";

const none: AccountState = { membership: null, profile: null, request: null };
const member = (
  role: "school_admin" | "reviewer" | "alumni",
  status: "active" | "suspended" | "revoked" = "active",
) => ({
  role,
  status,
});
const profile = (onboardingComplete = true, status: "active" | "suspended" = "active") => ({
  status,
  onboardingComplete,
});

describe("homeFor", () => {
  it.each<[string, AccountState, string]>([
    ["school admin", { ...none, membership: member("school_admin") }, "/admin"],
    ["reviewer", { ...none, membership: member("reviewer") }, "/admin"],
    [
      "staff who is also an alumnus",
      { membership: member("school_admin"), profile: profile(), request: "approved" },
      "/admin",
    ],
    [
      "approved alumnus",
      { membership: member("alumni"), profile: profile(), request: "approved" },
      "/directory",
    ],
    [
      "approved, onboarding not finished",
      { membership: member("alumni"), profile: profile(false), request: "approved" },
      "/onboarding",
    ],
    [
      "suspended membership",
      {
        membership: member("alumni", "suspended"),
        profile: profile(true, "suspended"),
        request: "approved",
      },
      "/account/suspended",
    ],
    [
      "suspended staff",
      { ...none, membership: member("reviewer", "suspended") },
      "/account/suspended",
    ],
    ["sign-up pending", { ...none, request: "pending" }, "/account/pending"],
    ["needs info", { ...none, request: "needs_info" }, "/account/needs-info"],
    ["rejected", { ...none, request: "rejected" }, "/account/rejected"],
    ["withdrawn", { ...none, request: "withdrawn" }, "/join"],
    ["nothing at this school", none, "/join"],
    [
      "self-deleted (membership revoked)",
      { membership: member("alumni", "revoked"), profile: null, request: "approved" },
      "/join",
    ],
  ])("%s", (_, state, home) => {
    expect(homeFor(state)).toBe(home);
  });
});

describe("canOpen", () => {
  const alumnus: AccountState = {
    membership: member("alumni"),
    profile: profile(),
    request: "approved",
  };
  const staff: AccountState = { ...none, membership: member("school_admin") };
  const pending: AccountState = { ...none, request: "pending" };

  it("lets alumni use the directory and profiles, not admin", () => {
    expect(canOpen(alumnus, "/directory")).toBe(true);
    expect(canOpen(alumnus, "/profile/abc?x=1")).toBe(true);
    expect(canOpen(alumnus, "/admin")).toBe(false);
    expect(canOpen(alumnus, "/join")).toBe(false);
  });

  it("keeps staff without an alumni profile out of the directory (DEC-04)", () => {
    expect(canOpen(staff, "/admin/requests")).toBe(true);
    expect(canOpen(staff, "/directory")).toBe(false);
    expect(canOpen({ ...staff, profile: profile() }, "/directory")).toBe(true);
  });

  it("opens an account page only for the matching state", () => {
    expect(canOpen(pending, "/account/pending")).toBe(true);
    expect(canOpen(pending, "/account/rejected")).toBe(false);
    expect(canOpen(pending, "/directory")).toBe(false);
    expect(canOpen(pending, "/account/email")).toBe(true);
    expect(canOpen(pending, "/account/password")).toBe(true);
    expect(canOpen(none, "/account/password")).toBe(true);
  });

  it("does not treat look-alike prefixes as the same page", () => {
    expect(canOpen(pending, "/directory-export")).toBe(true);
    expect(canOpen(alumnus, "/administrator")).toBe(true);
  });
});

describe("safeNext", () => {
  it.each([
    ["/directory", "/directory"],
    ["/profile/1?tab=work#top", "/profile/1?tab=work#top"],
    ["https://evil.example", null],
    ["//evil.example", null],
    ["/\\evil.example", null],
    ["/%5Cevil", "/%5Cevil"],
    ["javascript:alert(1)", null],
    ["directory", null],
    ["/a\nb", null],
    ["", null],
    [null, null],
  ])("%s → %s", (value, expected) => {
    expect(safeNext(value)).toBe(expected);
  });
});
