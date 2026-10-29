// Where each person belongs at a school (ADR 0014). Pure, so every state is unit-tested; the server reads the
// state in lib/auth/account.ts. The school is the one of the current address: a person's state at another
// school never matters here (DEC-13).
import type { Enums } from "@/lib/database";

export type AccountState = {
  /** The membership at this school, if any. */
  membership: { role: Enums<"member_role">; status: Enums<"member_status"> } | null;
  /** The person's own profile at this school, if any. */
  profile: { status: Enums<"profile_status">; onboardingComplete: boolean } | null;
  /** Status of the latest access request at this school, if any. */
  request: Enums<"request_status"> | null;
  /** A platform admin (ADR 0005): no access to a school's data without a support grant. */
  platformAdmin?: boolean;
};

const STAFF: Enums<"member_role">[] = ["school_admin", "reviewer"];

const isActiveMember = (s: AccountState) => s.membership?.status === "active";
const isStaff = (s: AccountState) => isActiveMember(s) && STAFF.includes(s.membership!.role);
const hasActiveProfile = (s: AccountState) => isActiveMember(s) && s.profile?.status === "active";
const canUseDirectory = (s: AccountState) => hasActiveProfile(s) && s.profile!.onboardingComplete;

/** The page a signed-in person lands on at this school. */
export function homeFor(state: AccountState): string {
  if (isStaff(state)) return "/admin";
  if (isActiveMember(state)) {
    if (canUseDirectory(state)) return "/directory";
    if (hasActiveProfile(state)) return "/onboarding";
    return "/account/suspended";
  }
  if (state.membership?.status === "suspended") return "/account/suspended";
  switch (state.request) {
    case "pending":
      return "/account/pending";
    case "needs_info":
      return "/account/needs-info";
    case "rejected":
      return "/account/rejected";
    default:
      // No relationship yet, a withdrawn request, or a revoked membership (self-deleted, removed staff). A platform
      // admin with no role here gets a page about support access and the console, not the sign-up form.
      return state.platformAdmin ? "/account/platform" : "/join";
  }
}

/** Whether a signed-in person may open a path at this school. Paths not listed here are open to anyone. */
export function canOpen(state: AccountState, path: string): boolean {
  const [pathname = "/"] = path.split(/[?#]/);
  const under = (prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);
  if (under("/directory") || under("/profile")) return canUseDirectory(state);
  if (under("/admin")) return isStaff(state);
  if (under("/onboarding") || under("/me")) return hasActiveProfile(state);
  // Sign-in settings are open to anyone signed in, whatever their state at this school.
  if (pathname === "/account/email" || pathname === "/account/password") return true;
  // A platform admin with no role here may still sign up as a graduate of the school.
  if (pathname === "/join" && homeFor(state) === "/account/platform") return true;
  if (under("/account") || under("/join")) return homeFor(state) === pathname;
  return true;
}
