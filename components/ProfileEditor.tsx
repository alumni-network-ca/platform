"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CAREER_FIELDS, HELP_OPTIONS } from "@/lib/profile-options";

type Exp = {
  id?: string;
  job_title: string;
  employer: string;
  career_field: string | null;
  location: string | null;
  start_year: number | null;
  end_year: number | null;
  is_current: boolean;
};
type Edu = {
  id?: string;
  school: string;
  degree: string | null;
  field_of_study: string | null;
  graduation_year: number | null;
};
type Props = { profile: any; flags: any; experience: Exp[]; education: Edu[] };

export function ProfileEditor({ profile, flags, experience, education }: Props) {
  const [f, setF] = useState({
    ...profile,
    career_field: profile.profession || "",
    career_field_other: "",
  });
  const [a, setA] = useState({
    ...Object.fromEntries(HELP_OPTIONS.map(([k]) => [k, false])),
    ...flags,
  });
  const [exps, setExps] = useState<Exp[]>(experience.filter((x) => !x.is_current));
  const [edus, setEdus] = useState<Edu[]>(education);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const finalCareer = f.career_field === "Other" ? f.career_field_other : f.career_field;
  const updExp = (i: number, k: keyof Exp, v: any) =>
    setExps((x) => x.map((r, n) => (n === i ? { ...r, [k]: v } : r)));
  const updEdu = (i: number, k: keyof Edu, v: any) =>
    setEdus((x) => x.map((r, n) => (n === i ? { ...r, [k]: v } : r)));

  async function save() {
    setSaving(true);
    setMsg("");
    const supabase = createClient();
    const { error } = await supabase
      .from("alumni_profiles")
      .update({
        first_name: f.first_name,
        last_name: f.last_name,
        grad_year: f.grad_year ? Number(f.grad_year) : null,
        profession: finalCareer || null,
        industry: null,
        job_title: f.job_title || null,
        current_employer: f.current_employer || null,
        current_city: f.current_city || null,
        current_country: f.current_country || null,
        bio: f.bio || null,
        linkedin_url: f.linkedin_url || null,
        website_url: f.website_url || null,
        is_directory_visible: f.is_directory_visible,
        contact_allowed: f.contact_allowed,
        privacy_preset: f.privacy_preset,
        last_confirmed_at: new Date().toISOString(),
      })
      .eq("id", profile.id);
    if (error) {
      setSaving(false);
      setMsg(error.message);
      return;
    }
    await supabase.from("availability_flags").upsert({
      profile_id: profile.id,
      institution_id: profile.institution_id,
      ...Object.fromEntries(HELP_OPTIONS.map(([k]) => [k, Boolean(a[k])])),
    });
    await supabase.from("alumni_education").delete().eq("profile_id", profile.id);
    if (edus.length)
      await supabase.from("alumni_education").insert(
        edus
          .filter((x) => x.school)
          .map((x, i) => ({
            profile_id: profile.id,
            institution_id: profile.institution_id,
            school: x.school,
            degree: x.degree || null,
            field_of_study: x.field_of_study || null,
            graduation_year: x.graduation_year ? Number(x.graduation_year) : null,
            sort_order: i,
          })),
      );
    await supabase.from("alumni_experience").delete().eq("profile_id", profile.id);
    const rows = [
      ...(f.job_title || f.current_employer
        ? [
            {
              profile_id: profile.id,
              institution_id: profile.institution_id,
              job_title: f.job_title || "Current role",
              employer: f.current_employer || "",
              career_field: finalCareer || null,
              location: f.current_city || null,
              start_year: null,
              end_year: null,
              is_current: true,
              sort_order: 0,
            },
          ]
        : []),
      ...exps
        .filter((x) => x.job_title || x.employer)
        .map((x, i) => ({
          profile_id: profile.id,
          institution_id: profile.institution_id,
          job_title: x.job_title,
          employer: x.employer,
          career_field: x.career_field,
          location: x.location,
          start_year: x.start_year ? Number(x.start_year) : null,
          end_year: x.end_year ? Number(x.end_year) : null,
          is_current: false,
          sort_order: i + 1,
        })),
    ];
    if (rows.length) await supabase.from("alumni_experience").insert(rows);
    setSaving(false);
    setMsg("Profile saved and reconfirmed.");
  }
  return (
    <div className="profileEditLayout">
      <div>
        <section className="editorSection card">
          <h2>Herzliah & contact</h2>
          <div className="formGrid">
            <label>
              First name
              <input
                className="input"
                value={f.first_name}
                onChange={(e) => setF({ ...f, first_name: e.target.value })}
              />
            </label>
            <label>
              Last name
              <input
                className="input"
                value={f.last_name}
                onChange={(e) => setF({ ...f, last_name: e.target.value })}
              />
            </label>
            <label>
              Herzliah graduating class
              <input
                className="input"
                value={f.grad_year || ""}
                onChange={(e) => setF({ ...f, grad_year: e.target.value })}
              />
            </label>
            <label>
              Current city
              <input
                className="input"
                value={f.current_city || ""}
                onChange={(e) => setF({ ...f, current_city: e.target.value })}
              />
            </label>
            <label>
              Country
              <input
                className="input"
                value={f.current_country || ""}
                onChange={(e) => setF({ ...f, current_country: e.target.value })}
              />
            </label>
            <label>
              LinkedIn
              <input
                className="input"
                value={f.linkedin_url || ""}
                onChange={(e) => setF({ ...f, linkedin_url: e.target.value })}
              />
            </label>
            <label className="full">
              About
              <textarea
                className="input"
                rows={4}
                value={f.bio || ""}
                onChange={(e) => setF({ ...f, bio: e.target.value })}
              />
            </label>
          </div>
        </section>
        <section className="editorSection card">
          <h2>Career</h2>
          <div className="formGrid">
            <label>
              Career field
              <select
                className="input"
                value={f.career_field}
                onChange={(e) => setF({ ...f, career_field: e.target.value })}
              >
                <option value="">Choose</option>
                {CAREER_FIELDS.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
              {f.career_field === "Other" && (
                <input
                  className="input"
                  placeholder="Other career field"
                  value={f.career_field_other}
                  onChange={(e) => setF({ ...f, career_field_other: e.target.value })}
                />
              )}
            </label>
            <label>
              Current job title
              <input
                className="input"
                value={f.job_title || ""}
                onChange={(e) => setF({ ...f, job_title: e.target.value })}
              />
            </label>
            <label>
              Current employer
              <input
                className="input"
                value={f.current_employer || ""}
                onChange={(e) => setF({ ...f, current_employer: e.target.value })}
              />
            </label>
          </div>
          <h3>Previous jobs</h3>
          {exps.map((x, i) => (
            <div className="repeatCard" key={i}>
              <div className="repeatHead">
                <h4>Previous role {i + 1}</h4>
                <button
                  className="removeBtn"
                  onClick={() => setExps((v) => v.filter((_, n) => n !== i))}
                >
                  Remove
                </button>
              </div>
              <div className="formGrid">
                <label>
                  Job title
                  <input
                    className="input"
                    value={x.job_title}
                    onChange={(e) => updExp(i, "job_title", e.target.value)}
                  />
                </label>
                <label>
                  Employer
                  <input
                    className="input"
                    value={x.employer}
                    onChange={(e) => updExp(i, "employer", e.target.value)}
                  />
                </label>
                <label>
                  Career field
                  <select
                    className="input"
                    value={x.career_field || ""}
                    onChange={(e) => updExp(i, "career_field", e.target.value)}
                  >
                    <option value="">Choose</option>
                    {CAREER_FIELDS.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Location
                  <input
                    className="input"
                    value={x.location || ""}
                    onChange={(e) => updExp(i, "location", e.target.value)}
                  />
                </label>
                <label>
                  Start year
                  <input
                    className="input"
                    value={x.start_year || ""}
                    onChange={(e) => updExp(i, "start_year", e.target.value)}
                  />
                </label>
                <label>
                  End year
                  <input
                    className="input"
                    value={x.end_year || ""}
                    onChange={(e) => updExp(i, "end_year", e.target.value)}
                  />
                </label>
              </div>
            </div>
          ))}
          <button
            className="addRowBtn"
            onClick={() =>
              setExps((v) => [
                ...v,
                {
                  job_title: "",
                  employer: "",
                  career_field: "",
                  location: "",
                  start_year: null,
                  end_year: null,
                  is_current: false,
                },
              ])
            }
          >
            + Add previous job
          </button>
        </section>
        <section className="editorSection card">
          <h2>Education</h2>
          {edus.map((x, i) => (
            <div className="repeatCard" key={i}>
              <div className="repeatHead">
                <h4>Education {i + 1}</h4>
                <button
                  className="removeBtn"
                  onClick={() => setEdus((v) => v.filter((_, n) => n !== i))}
                >
                  Remove
                </button>
              </div>
              <div className="formGrid">
                <label>
                  School
                  <input
                    className="input"
                    value={x.school}
                    onChange={(e) => updEdu(i, "school", e.target.value)}
                  />
                </label>
                <label>
                  Degree
                  <input
                    className="input"
                    value={x.degree || ""}
                    onChange={(e) => updEdu(i, "degree", e.target.value)}
                  />
                </label>
                <label>
                  Field of study
                  <input
                    className="input"
                    value={x.field_of_study || ""}
                    onChange={(e) => updEdu(i, "field_of_study", e.target.value)}
                  />
                </label>
                <label>
                  Graduation year
                  <input
                    className="input"
                    value={x.graduation_year || ""}
                    onChange={(e) => updEdu(i, "graduation_year", e.target.value)}
                  />
                </label>
              </div>
            </div>
          ))}
          <button
            className="addRowBtn"
            onClick={() =>
              setEdus((v) => [
                ...v,
                { school: "", degree: "", field_of_study: "", graduation_year: null },
              ])
            }
          >
            + Add education
          </button>
        </section>
        <section className="editorSection card">
          <h2>Networking preferences</h2>
          <div className="choiceGrid">
            {HELP_OPTIONS.map(([k, l]) => (
              <label className="choice" key={k}>
                <input
                  type="checkbox"
                  checked={Boolean(a[k])}
                  onChange={(e) => setA({ ...a, [k]: e.target.checked })}
                />
                {l}
              </label>
            ))}
          </div>
        </section>
      </div>
      <aside>
        <div className="sideCard stickyCard">
          <h3>Privacy</h3>
          <label className="switchRow">
            <span>
              <strong>Directory visibility</strong>
              <small>Show to verified alumni.</small>
            </span>
            <input
              type="checkbox"
              checked={f.is_directory_visible}
              onChange={(e) => setF({ ...f, is_directory_visible: e.target.checked })}
            />
          </label>
          <label className="switchRow">
            <span>
              <strong>Allow contact</strong>
              <small>Let verified members contact you.</small>
            </span>
            <input
              type="checkbox"
              checked={f.contact_allowed}
              onChange={(e) => setF({ ...f, contact_allowed: e.target.checked })}
            />
          </label>
          <button className="btn btnPrimary btnWide" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save profile"}
          </button>
          {msg && <div className="notice">{msg}</div>}
        </div>
      </aside>
    </div>
  );
}
