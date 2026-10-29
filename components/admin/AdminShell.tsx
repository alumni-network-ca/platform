import { Nav } from "@/components/Nav";
import { AdminNav } from "./AdminNav";
import { requireStaff } from "@/lib/auth/staff";
import { adminCopy, read } from "@/lib/admin/data";
import { adminSections } from "@/lib/admin/sections";
export async function AdminShell({ children }: { children: React.ReactNode }) {
  const { supabase, school, can } = await requireStaff("/admin");
  const { t } = await adminCopy();
  const metrics = await read(supabase.rpc("admin_dashboard", { p_inst: school.id }));
  const sections = adminSections(can, metrics.pending).map((s) => ({ ...s, label: t[s.key] }));
  return (
    <div className="shell">
      <Nav />
      <div className="shellBody">
        <AdminNav sections={sections} label={t.dashboard} />
        <main className="shellMain">{children}</main>
      </div>
    </div>
  );
}
