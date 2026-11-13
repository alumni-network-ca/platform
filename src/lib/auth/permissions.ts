import "server-only";
import type { Enums } from "@/lib/database";
import { schoolConfig } from "@/lib/tenant/config";
/** A role's permissions, from the school's cached config. RLS and the RPCs check them again in the database. */
export async function rolePermissions(schoolId: string, role: Enums<"member_role">) {
  return (await schoolConfig(schoolId)).role_permissions[role] ?? [];
}
