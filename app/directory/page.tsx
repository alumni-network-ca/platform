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
  const { data, error } = await supabase
    .from("alumni_profiles")
    .select(
      "id,first_name,last_name,grad_year,profession,current_employer,job_title,current_city,current_country,universities,availability_flags(*)",
    )
    .eq("is_directory_visible", true)
    .not("claimed_at", "is", null)
    .order("last_name");
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
