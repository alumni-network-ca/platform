import { requireStaff } from "@/lib/auth/staff";
import { adminCopy } from "@/lib/admin/data";
import { alumniCsv, rosterArgs, rosterFilters } from "@/lib/admin/roster";

// The roster's "Export CSV" button (EXP-01, first cut): every record matching the roster's current filters, as a
// CSV file. School admins only: requireStaff answers 403 without records.export, and admin_export_alumni checks it
// again in the database and writes the audit row. A POST, so prefetching or a link scanner never starts an export.
// The file is streamed to the admin and never stored (private storage and signed links are EXP-02).
export async function POST(request: Request) {
  const { supabase, school } = await requireStaff("/admin/alumni", "records.export");
  const form = await request.formData();
  const filters = rosterFilters((key) => {
    const value = form.get(key);
    return typeof value === "string" ? value : null;
  });
  const { data, error } = await supabase.rpc("admin_export_alumni", rosterArgs(school.id, filters));
  if (error)
    return new Response("Could not export the alumni list.", {
      status: error.code === "42501" ? 403 : error.code === "22023" ? 400 : 500,
    });
  const { t, locale } = await adminCopy();
  const day = new Date().toISOString().slice(0, 10);
  return new Response(alumniCsv(data ?? [], t, locale), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${school.slug}-alumni-${day}.csv"`,
      "cache-control": "no-store",
    },
  });
}
