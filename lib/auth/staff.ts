import "server-only";
import { forbidden } from "next/navigation";
import { requireAccess } from "@/lib/auth/account";
import { rolePermissions } from "@/lib/auth/permissions";
// Every page and action calls this: layouts persist between navigations.
export async function requireStaff(path: string, permission = "metrics.read") {
  const { supabase, school, user, state } = await requireAccess(path);
  const role = state.membership?.role;
  if (state.membership?.status !== "active" || (role !== "school_admin" && role !== "reviewer"))
    forbidden();
  // TODO(FND-11): require aal2 once staff MFA enrolment is available.
  const permissions = new Set(await rolePermissions(role));
  const can = (key: string) => permissions.has(key);
  if (!can(permission)) forbidden();
  return { supabase, school, user, role, can };
}
