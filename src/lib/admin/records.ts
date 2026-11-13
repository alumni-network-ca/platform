import "server-only";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/staff";
export async function staffRecord(id: string, permission = "records.read") {
  const access = await requireStaff("/admin/alumni/" + id, permission);
  const { data: profile, error } = await access.supabase
    .from("alumni_profiles")
    .select("*")
    .eq("institution_id", access.school.id)
    .eq("id", id)
    .neq("status", "deleted")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!profile) notFound();
  return { ...access, profile };
}
