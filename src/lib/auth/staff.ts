import "server-only";
import { forbidden } from "next/navigation";
import { cache } from "react";
import { requireAccess } from "@/lib/auth/account";
import { rolePermissions } from "@/lib/auth/permissions";
// Every page and action calls this: layouts persist between navigations. A section whose 403 must survive its
// loading skeleton also calls it from its layout (app/admin/staff/layout.tsx); cache() makes that one check per request.
export const requireStaff = cache(async (path: string, permission = "metrics.read") => {
  const { supabase, school, user, state } = await requireAccess(path);
  const role = state.membership?.role;
  if (state.membership?.status !== "active" || (role !== "school_admin" && role !== "reviewer"))
    forbidden();
  // TODO(FND-11): require aal2 once staff MFA enrolment is available.
  const permissions = new Set(await rolePermissions(school.id, role));
  const can = (key: string) => permissions.has(key);
  if (!can(permission)) forbidden();
  return { supabase, school, user, role, can };
});
