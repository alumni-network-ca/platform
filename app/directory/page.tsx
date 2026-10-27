import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { DirectoryClient } from "@/components/DirectoryClient";
import { createClient } from "@/lib/supabase/server";

export default async function DirectoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/directory");
  // v2 schema: the school comes from its slug (host-based resolution arrives in FND-07) and rows come from
  // search_directory, which only returns directory-safe columns. Mapped to the shape DirectoryClient still
  // expects until the directory UI is rebuilt (DIR-02).
  const slug = process.env.NEXT_PUBLIC_DEFAULT_INSTITUTION_SLUG ?? "herzliah";
  const { data: school } = await supabase.rpc("public_school", { p_slug: slug });
  const { data: rows, error } = school
    ? await supabase.rpc("search_directory", { p_inst: school.id, p_limit: 100 })
    : { data: [], error: null };
  const data = (rows ?? []).map((r) => ({
    id: r.id,
    first_name: r.preferred_name || r.first_name,
    last_name: r.last_name,
    grad_year: r.grad_year,
    profession: r.career_field_en,
    current_employer: r.employer,
    job_title: r.job_title,
    current_city: r.city,
    current_country: r.country,
    universities: r.schools,
    availability_flags: Object.fromEntries(r.offers.map((key) => [key, true])),
  }));
  return (
    <>
      <Nav />
      <main className="page directoryPage">
        <div className="pageHeader">
          <div>
            <div className="eyebrow">Verified Herzliah members</div>
            <h1>Alumni directory</h1>
            <p className="muted">
              Search by career field, university, city, Herzliah graduating class and what alumni
              are open to.
            </p>
          </div>
          <div className="privacyBadge">🔒 Private directory</div>
        </div>
        {error ? (
          <div className="notice">{error.message}</div>
        ) : (
          <DirectoryClient profiles={data || []} />
        )}
      </main>
    </>
  );
}
