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
    // Below the nav bar (66px), which the root layout renders.
    <div className="flex min-h-[calc(100vh-66px)] flex-col bg-background text-foreground">
      <div className="flex flex-1 flex-wrap">
        <AdminNav sections={sections} label={t.dashboard} />
        <main className="flex min-w-0 flex-[999_1_640px] flex-col gap-5 px-9 py-7 max-[700px]:px-4 max-[700px]:py-5">
          {children}
        </main>
      </div>
    </div>
  );
}
