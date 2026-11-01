import { requireAccess } from "@/lib/auth/account";

// "Download my data" (PRF-06, Law 25): everything export_my_data returns for this school, as a JSON file. A POST
// from the button on /me, so prefetching or a link scanner never starts an export (each one is audited).
export async function POST() {
  const { school, supabase } = await requireAccess("/me");
  const { data, error } = await supabase.rpc("export_my_data", { p_inst: school.id });
  if (error)
    return new Response("Could not export your data.", {
      status: error.code === "42501" ? 403 : 500,
    });
  const day = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${school.slug}-my-data-${day}.json"`,
      "cache-control": "no-store",
    },
  });
}
