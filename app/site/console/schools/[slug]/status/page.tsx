import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/auth/platform";
import { StatusForm } from "./StatusForm";
import { BackArrow } from "@/components/icons";
import { ui } from "@/components/admin/parts";

// S2.2 Suspend or reactivate a school.
export default async function SchoolStatusPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { supabase } = await requirePlatformAdmin(`/console/schools/${slug}/status`);
  const { data: school } = await supabase
    .from("institutions")
    .select("name, slug, status")
    .eq("slug", slug)
    .maybeSingle();
  if (!school) notFound();
  const suspended = school.status === "suspended";
  return (
    <>
      <Link className={ui.backLink} href={`/console/schools/${school.slug}`}>
        <BackArrow />
        {school.name}
      </Link>
      <div className={ui.shellTitle}>
        <div>
          <h1>
            {suspended ? "Reactivate" : "Suspend"} {school.name}
          </h1>
        </div>
      </div>
      <section className={ui.panel} style={{ maxWidth: 720 }}>
        <StatusForm slug={school.slug} suspended={suspended} />
      </section>
    </>
  );
}
