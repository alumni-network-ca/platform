import "server-only";
import { cache } from "react";
import type { Enums } from "@/lib/database";
import { createClient } from "@/lib/supabase/server";
export const rolePermissions = cache(async (role: Enums<"member_role">) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("role_permissions")
    .select("permission")
    .eq("role", role);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.permission);
});
