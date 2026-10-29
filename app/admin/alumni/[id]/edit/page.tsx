import Link from "next/link";
import { staffRecord } from "@/lib/admin/records";
import { adminCopy } from "@/lib/admin/data";
import { ActionForm } from "@/components/admin/ActionForm";
import { editRecord } from "../actions";
export default async function Edit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile: p, supabase, school } = await staffRecord(id, "records.edit");
  const { t } = await adminCopy();
  const { data: privateData, error } = await supabase
    .from("alumni_private")
    .select("*")
    .eq("institution_id", school.id)
    .eq("profile_id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  // Simple edit route fills the canvas gap, using only fields admin_update_profile accepts.
  const fields = [
    { key: "first_name", value: p.first_name, max: 80 },
    { key: "last_name", value: p.last_name, max: 80 },
    { key: "preferred_name", value: p.preferred_name, max: 80 },
    { key: "city", value: p.city, max: 80 },
    { key: "country", value: p.country, max: 80 },
    { key: "job_title", value: p.job_title, max: 120 },
    { key: "employer", value: p.employer, max: 120 },
    { key: "maiden_name", value: privateData?.maiden_name, max: 80 },
    { key: "school_student_id", value: privateData?.school_student_id, max: 40 },
  ] as const;
  return (
    <>
      <Link className="backLink" href={"/admin/alumni/" + id}>
        ← {p.first_name} {p.last_name}
      </Link>
      <div className="shellTitle">
        <h1>{t.edit}</h1>
      </div>
      <section className="panel">
        <ActionForm action={editRecord.bind(null, id)} label={t.save} t={t}>
          <div className="formRow">
            {fields.map((f) => (
              <label key={f.key} className="field">
                {t[f.key]}
                <input
                  className="input"
                  name={f.key}
                  maxLength={f.max}
                  required={f.key === "first_name" || f.key === "last_name"}
                  defaultValue={f.value ?? ""}
                />
              </label>
            ))}
            <label className="field">
              {t.grad_year}
              <input
                name="grad_year"
                className="input"
                required
                type="number"
                min={1900}
                max={2100}
                defaultValue={p.grad_year}
              />
            </label>
          </div>
          <label className="field">
            {t.admin_notes}
            <textarea
              className="input"
              name="admin_notes"
              rows={5}
              maxLength={2000}
              defaultValue={privateData?.admin_notes ?? ""}
            />
          </label>
        </ActionForm>
      </section>
    </>
  );
}
