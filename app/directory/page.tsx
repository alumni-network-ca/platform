import { Nav } from "@/components/Nav";
import { DirectoryClient } from "@/components/DirectoryClient";
import { requireAccess } from "@/lib/auth/account";
import { schoolBranding } from "@/lib/school";

export default async function DirectoryPage() {
  const { school, supabase } = await requireAccess("/directory");
  const { shortName } = schoolBranding(school);
  // Rows come from search_directory for the school of this address, with directory-safe columns only. Mapped
  // to the shape DirectoryClient still expects until the directory UI is rebuilt (DIR-02).
  const { data: rows, error } = await supabase.rpc("search_directory", {
    p_inst: school.id,
    p_limit: 100,
  });
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
            <div className="eyebrow">Verified {shortName} members</div>
            <h1>Alumni directory</h1>
            <p className="muted">
              Search by career field, university, city, {shortName} graduating class and what alumni
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
