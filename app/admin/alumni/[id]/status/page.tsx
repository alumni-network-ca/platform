import { staffRecord } from "@/lib/admin/records";
import { adminCopy, type Search } from "@/lib/admin/data";
import { StatusForm } from "./StatusForm";
export default async function Status({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Search;
}) {
  const { id } = await params;
  const { profile } = await staffRecord(id, "records.edit");
  const { t } = await adminCopy();
  const query = await searchParams;
  // Dedicated route with dialog styling rather than an intercepted modal (A2.3).
  return (
    <section className="panel adminDialog" aria-labelledby="status-title">
      <h1 id="status-title">
        {t.changeAccess}: {profile.first_name} {profile.last_name}
      </h1>
      <p>{profile.grad_year}</p>
      <StatusForm id={id} active={profile.status === "active"} initial={query.action ?? ""} t={t} />
    </section>
  );
}
