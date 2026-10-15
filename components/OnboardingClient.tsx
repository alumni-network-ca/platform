"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CAREER_FIELDS, HELP_OPTIONS } from "@/lib/profile-options";

type Experience = {
  job_title: string;
  employer: string;
  career_field: string;
  career_field_other: string;
  location: string;
  start_year: string;
  end_year: string;
  is_current: boolean;
};

type Education = {
  school: string;
  degree: string;
  field_of_study: string;
  graduation_year: string;
};

type Existing = {
  id: string;
  first_name: string;
  last_name: string;
  grad_year: number | null;
  profession: string | null;
  job_title: string | null;
  current_employer: string | null;
  current_city: string | null;
  current_country: string | null;
  work_city: string | null;
  work_country: string | null;
  bio: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  languages: string[] | null;
  contact_topics: string | null;
  is_directory_visible: boolean;
  contact_allowed: boolean;
  student_contact_allowed: boolean;
} | null;

const emptyExp = (): Experience => ({
  job_title: "",
  employer: "",
  career_field: "",
  career_field_other: "",
  location: "",
  start_year: "",
  end_year: "",
  is_current: false,
});

const emptyEdu = (): Education => ({
  school: "",
  degree: "",
  field_of_study: "",
  graduation_year: "",
});

export function OnboardingClient({
  isAdmin,
  institutionId,
  email,
  existing,
}: {
  isAdmin: boolean;
  institutionId: string | null;
  email: string;
  existing: Existing;
}) {
  const router = useRouter();

  const [step, setStep] = useState(existing ? 2 : 1);
  const [profileId, setProfileId] = useState(existing?.id || "");
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    first_name: existing?.first_name || "",
    last_name: existing?.last_name || "",
    grad_year: existing?.grad_year ? String(existing.grad_year) : "",

    current_city: existing?.current_city || "Montreal",
    current_country: existing?.current_country || "Canada",

    languages: existing?.languages?.join(", ") || "",
    bio: existing?.bio || "",
    linkedin_url: existing?.linkedin_url || "",
    website_url: existing?.website_url || "",

    career_field: existing?.profession || "",
    career_field_other: "",
    job_title: existing?.job_title || "",
    current_employer: existing?.current_employer || "",
    work_city: existing?.work_city || "",
    work_country: existing?.work_country || "",

    contact_topics: existing?.contact_topics || "",

    mentoring: false,
    career_advice: false,
    job_opportunities: false,
    offering_jobs: false,
    offering_internships: false,
    shadowing: false,
    speaking: false,
    networking: true,
    entrepreneurship: false,
    student_questions: false,

    is_directory_visible: existing?.is_directory_visible ?? true,
    contact_allowed: existing?.contact_allowed ?? true,
    student_contact_allowed: existing?.student_contact_allowed ?? false,
  });

  const [education, setEducation] = useState<Education[]>([emptyEdu()]);
  const [experience, setExperience] = useState<Experience[]>([]);

  const finalCareer =
    form.career_field === "Other"
      ? form.career_field_other
      : form.career_field;

  function updateForm(name: string, value: unknown) {
    setForm((v) => ({ ...v, [name]: value }));
  }

  function updateEdu(
    i: number,
    key: keyof Education,
    value: string
  ) {
    setEducation((v) =>
      v.map((x, n) => (n === i ? { ...x, [key]: value } : x))
    );
  }

  function updateExp(
    i: number,
    key: keyof Experience,
    value: string | boolean
  ) {
    setExperience((v) =>
      v.map((x, n) => (n === i ? { ...x, [key]: value } : x))
    );
  }

  async function matchRecord() {
    setMessage("");

    const supabase = createClient();

    const { data, error } = await supabase.rpc("claim_my_profile");

    if (error) {
      setMessage(error.message);
      return;
    }

    if (data) {
      setProfileId(data);

      const { data: p } = await supabase
        .from("alumni_profiles")
        .select("*")
        .eq("id", data)
        .single();

      if (p) {
        setForm((v) => ({
          ...v,
          first_name: p.first_name || "",
          last_name: p.last_name || "",
          grad_year: p.grad_year ? String(p.grad_year) : "",
          current_city: p.current_city || "Montreal",
          current_country: p.current_country || "Canada",
          career_field: p.profession || "",
          job_title: p.job_title || "",
          current_employer: p.current_employer || "",
          work_city: p.work_city || "",
          work_country: p.work_country || "",
          bio: p.bio || "",
          linkedin_url: p.linkedin_url || "",
          website_url: p.website_url || "",
          languages: Array.isArray(p.languages)
            ? p.languages.join(", ")
            : "",
          contact_topics: p.contact_topics || "",
        }));
      }

      setStep(2);
      setMessage(
        "We matched your Herzliah alumni record. Review and complete it below."
      );
      return;
    }

    if (isAdmin) {
      setStep(2);
      setMessage(
        "No imported alumni record matched this email. Because you're an administrator, you can create your own profile."
      );
    } else {
      setMessage(
        "We couldn't automatically match this email to an imported alumni record. Herzliah staff can verify you manually."
      );
    }
  }

  function validateIdentity() {
    if (!form.first_name || !form.last_name || !form.grad_year) {
      setMessage(
        "Please enter your first name, last name and Herzliah graduation year."
      );
      return false;
    }

    setMessage("");
    return true;
  }

  async function finish() {
    if (!institutionId) {
      setMessage(
        "Your Herzliah institution membership could not be identified."
      );
      return;
    }

    if (!validateIdentity()) return;

    if (!finalCareer) {
      setMessage(
        "Please choose a career field or select Other and describe it."
      );
      setStep(4);
      return;
    }

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    let id = profileId;

    const languages = form.languages
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

    const payload = {
      institution_id: institutionId,
      user_id: user.id,
      claim_email: email,

      first_name: form.first_name,
      last_name: form.last_name,
      grad_year: Number(form.grad_year),

      current_city: form.current_city || null,
      current_country: form.current_country || null,

      languages,
      bio: form.bio || null,
      linkedin_url: form.linkedin_url || null,
      website_url: form.website_url || null,

      profession: finalCareer,
      industry: null,
      job_title: form.job_title || null,
      current_employer: form.current_employer || null,
      work_city: form.work_city || null,
      work_country: form.work_country || null,

      contact_topics: form.contact_topics || null,

      is_directory_visible: form.is_directory_visible,
      contact_allowed: form.contact_allowed,
      student_contact_allowed: form.student_contact_allowed,

      privacy_preset: "alumni_only",

      claimed_at: new Date().toISOString(),
      last_confirmed_at: new Date().toISOString(),
      onboarding_completed_at: new Date().toISOString(),
    };

    if (id) {
      const { error } = await supabase
        .from("alumni_profiles")
        .update(payload)
        .eq("id", id);

      if (error) {
        setMessage(error.message);
        return;
      }
    } else {
      const { data: p, error } = await supabase
        .from("alumni_profiles")
        .insert(payload)
        .select("id")
        .single();

      if (error) {
        setMessage(error.message);
        return;
      }

      id = p.id;
      setProfileId(id);
    }

    const helpPayload = Object.fromEntries(
      HELP_OPTIONS.map(([k]) => [
        k,
        Boolean(form[k as keyof typeof form]),
      ])
    );

    await supabase.from("availability_flags").upsert({
      profile_id: id,
      institution_id: institutionId,
      ...helpPayload,
    });

    await supabase
      .from("alumni_education")
      .delete()
      .eq("profile_id", id);

    const edRows = education
      .filter(
        (e) => e.school || e.degree || e.field_of_study
      )
      .map((e, i) => ({
        profile_id: id,
        institution_id: institutionId,
        school: e.school,
        degree: e.degree || null,
        field_of_study: e.field_of_study || null,
        graduation_year: e.graduation_year
          ? Number(e.graduation_year)
          : null,
        sort_order: i,
      }));

    if (edRows.length) {
      await supabase.from("alumni_education").insert(edRows);
    }

    await supabase
      .from("alumni_experience")
      .delete()
      .eq("profile_id", id);

    const currentRow =
      form.job_title || form.current_employer
        ? {
            profile_id: id,
            institution_id: institutionId,
            job_title: form.job_title || "Current role",
            employer: form.current_employer || "",
            career_field: finalCareer,
            location:
              [form.work_city, form.work_country]
                .filter(Boolean)
                .join(", ") || null,
            start_year: null,
            end_year: null,
            is_current: true,
            sort_order: 0,
          }
        : null;

    const expRows = experience
      .filter((e) => e.job_title || e.employer)
      .map((e, i) => ({
        profile_id: id,
        institution_id: institutionId,
        job_title: e.job_title || "",
        employer: e.employer || "",
        career_field:
          e.career_field === "Other"
            ? e.career_field_other
            : e.career_field || null,
        location: e.location || null,
        start_year: e.start_year
          ? Number(e.start_year)
          : null,
        end_year: e.end_year
          ? Number(e.end_year)
          : null,
        is_current: false,
        sort_order: i + 1,
      }));

    const rows = currentRow
      ? [currentRow, ...expRows]
      : expRows;

    if (rows.length) {
      await supabase.from("alumni_experience").insert(rows);
    }

    setMessage("Your profile is complete and ready.");

    router.push("/me");
    router.refresh();
  }

  return (
    <div className="wizardShell">
      <div className="wizardTop">
        <div>
          <div className="eyebrow">Alumni onboarding</div>

          <h1>Complete your Herzliah profile.</h1>

          <p className="muted">
            Build your alumni profile so classmates, alumni and the
            Herzliah community can find and connect with you.
          </p>
        </div>
      </div>

      <div className="stepTabs">
        {[
          "Account",
          "Herzliah",
          "Education",
          "Career",
          "Network",
        ].map((x, i) => (
          <div
            key={x}
            className={`stepTab ${
              step === i + 1
                ? "on"
                : step > i + 1
                ? "done"
                : ""
            }`}
          >
            {i + 1}. {x}
          </div>
        ))}
      </div>

      {step === 1 && (
        <section className="wizardSection">
          <h2>Connect your account</h2>

          <p className="intro">
            You&apos;re signed in as <strong>{email}</strong>. We&apos;ll
            securely match your email with the alumni information
            Herzliah has on file.
          </p>

          <button
            className="btn btnPrimary"
            onClick={matchRecord}
          >
            Match my alumni record
          </button>
        </section>
      )}

      {step === 2 && (
        <section className="wizardSection">
          <h2>Your Herzliah profile</h2>

          <p className="intro">
            Tell the alumni community who you are and where life has
            taken you since Herzliah.
          </p>

          <div className="formGrid">
            <label>
              First name
              <input
                className="input"
                value={form.first_name}
                onChange={(e) =>
                  updateForm("first_name", e.target.value)
                }
              />
            </label>

            <label>
              Last name
              <input
                className="input"
                value={form.last_name}
                onChange={(e) =>
                  updateForm("last_name", e.target.value)
                }
              />
            </label>

            <label>
              Herzliah graduating class
              <input
                className="input"
                inputMode="numeric"
                placeholder="e.g. 2018"
                value={form.grad_year}
                onChange={(e) =>
                  updateForm("grad_year", e.target.value)
                }
              />
            </label>

            <label>
              City you live in
              <input
                className="input"
                placeholder="e.g. Montreal"
                value={form.current_city}
                onChange={(e) =>
                  updateForm("current_city", e.target.value)
                }
              />
            </label>

            <label>
              Country
              <input
                className="input"
                value={form.current_country}
                onChange={(e) =>
                  updateForm("current_country", e.target.value)
                }
              />
            </label>

            <label>
              Languages
              <input
                className="input"
                placeholder="English, French, Hebrew"
                value={form.languages}
                onChange={(e) =>
                  updateForm("languages", e.target.value)
                }
              />
            </label>

            <label>
              LinkedIn
              <input
                className="input"
                placeholder="https://linkedin.com/in/..."
                value={form.linkedin_url}
                onChange={(e) =>
                  updateForm("linkedin_url", e.target.value)
                }
              />
            </label>

            <label>
              Personal or company website
              <input
                className="input"
                placeholder="https://..."
                value={form.website_url}
                onChange={(e) =>
                  updateForm("website_url", e.target.value)
                }
              />
            </label>

            <label className="full">
              Tell the community a little about yourself
              <textarea
                className="input"
                rows={4}
                placeholder="A short introduction about yourself, your interests, career or what you've been doing since Herzliah."
                value={form.bio}
                onChange={(e) =>
                  updateForm("bio", e.target.value)
                }
              />
            </label>
          </div>

          <div className="wizardActions">
            <span />

            <button
              className="btn btnPrimary"
              onClick={() => {
                if (validateIdentity()) setStep(3);
              }}
            >
              Continue →
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="wizardSection">
          <h2>Education after Herzliah</h2>

          <p className="intro">
            Add university, CEGEP, professional school, graduate
            programs or other education. You can add more than one.
          </p>

          {education.map((e, i) => (
            <div className="repeatCard" key={i}>
              <div className="repeatHead">
                <h4>Education {i + 1}</h4>

                {education.length > 1 && (
                  <button
                    className="removeBtn"
                    onClick={() =>
                      setEducation((v) =>
                        v.filter((_, n) => n !== i)
                      )
                    }
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="formGrid">
                <label>
                  School / university
                  <input
                    className="input"
                    placeholder="e.g. McGill University"
                    value={e.school}
                    onChange={(x) =>
                      updateEdu(i, "school", x.target.value)
                    }
                  />
                </label>

                <label>
                  Degree / diploma
                  <input
                    className="input"
                    placeholder="e.g. BSc, JD, MD"
                    value={e.degree}
                    onChange={(x) =>
                      updateEdu(i, "degree", x.target.value)
                    }
                  />
                </label>

                <label>
                  Field of study
                  <input
                    className="input"
                    placeholder="e.g. Finance, Biology"
                    value={e.field_of_study}
                    onChange={(x) =>
                      updateEdu(
                        i,
                        "field_of_study",
                        x.target.value
                      )
                    }
                  />
                </label>

                <label>
                  Graduation year
                  <input
                    className="input"
                    inputMode="numeric"
                    value={e.graduation_year}
                    onChange={(x) =>
                      updateEdu(
                        i,
                        "graduation_year",
                        x.target.value
                      )
                    }
                  />
                </label>
              </div>
            </div>
          ))}

          <button
            className="addRowBtn"
            onClick={() =>
              setEducation((v) => [...v, emptyEdu()])
            }
          >
            + Add another school
          </button>

          <div className="wizardActions">
            <button
              className="btn btnLight"
              onClick={() => setStep(2)}
            >
              ← Back
            </button>

            <button
              className="btn btnPrimary"
              onClick={() => setStep(4)}
            >
              Continue →
            </button>
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="wizardSection">
          <h2>Your career</h2>

          <p className="intro">
            Choose a broad career field for Directory filtering.
            Your exact title and employer tell alumni what you
            actually do.
          </p>

          <div className="formGrid">
            <label>
              Career field
              <select
                className="input"
                value={form.career_field}
                onChange={(e) =>
                  updateForm("career_field", e.target.value)
                }
              >
                <option value="">
                  Choose a career field
                </option>

                {CAREER_FIELDS.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>

              {form.career_field === "Other" && (
                <input
                  className="input"
                  placeholder="Describe your career field"
                  value={form.career_field_other}
                  onChange={(e) =>
                    updateForm(
                      "career_field_other",
                      e.target.value
                    )
                  }
                />
              )}
            </label>

            <label>
              Current job title
              <input
                className="input"
                placeholder="e.g. Family Physician"
                value={form.job_title}
                onChange={(e) =>
                  updateForm("job_title", e.target.value)
                }
              />
            </label>

            <label>
              Current employer / organization
              <input
                className="input"
                value={form.current_employer}
                onChange={(e) =>
                  updateForm(
                    "current_employer",
                    e.target.value
                  )
                }
              />
            </label>

            <label>
              Work city
              <input
                className="input"
                placeholder="e.g. Montreal"
                value={form.work_city}
                onChange={(e) =>
                  updateForm("work_city", e.target.value)
                }
              />
            </label>

            <label>
              Work country
              <input
                className="input"
                placeholder="e.g. Canada"
                value={form.work_country}
                onChange={(e) =>
                  updateForm("work_country", e.target.value)
                }
              />
            </label>
          </div>

          <h3>Previous experience</h3>

          <p className="muted">
            Optional, but useful when alumni are searching for
            someone with experience at a company or in another
            industry.
          </p>

          {experience.map((e, i) => (
            <div className="repeatCard" key={i}>
              <div className="repeatHead">
                <h4>Previous role {i + 1}</h4>

                <button
                  className="removeBtn"
                  onClick={() =>
                    setExperience((v) =>
                      v.filter((_, n) => n !== i)
                    )
                  }
                >
                  Remove
                </button>
              </div>

              <div className="formGrid">
                <label>
                  Job title
                  <input
                    className="input"
                    value={e.job_title}
                    onChange={(x) =>
                      updateExp(
                        i,
                        "job_title",
                        x.target.value
                      )
                    }
                  />
                </label>

                <label>
                  Employer
                  <input
                    className="input"
                    value={e.employer}
                    onChange={(x) =>
                      updateExp(
                        i,
                        "employer",
                        x.target.value
                      )
                    }
                  />
                </label>

                <label>
                  Career field
                  <select
                    className="input"
                    value={e.career_field}
                    onChange={(x) =>
                      updateExp(
                        i,
                        "career_field",
                        x.target.value
                      )
                    }
                  >
                    <option value="">Choose</option>

                    {CAREER_FIELDS.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>

                  {e.career_field === "Other" && (
                    <input
                      className="input"
                      placeholder="Other career field"
                      value={e.career_field_other}
                      onChange={(x) =>
                        updateExp(
                          i,
                          "career_field_other",
                          x.target.value
                        )
                      }
                    />
                  )}
                </label>

                <label>
                  Location
                  <input
                    className="input"
                    value={e.location}
                    onChange={(x) =>
                      updateExp(
                        i,
                        "location",
                        x.target.value
                      )
                    }
                  />
                </label>

                <label>
                  Start year
                  <input
                    className="input"
                    inputMode="numeric"
                    value={e.start_year}
                    onChange={(x) =>
                      updateExp(
                        i,
                        "start_year",
                        x.target.value
                      )
                    }
                  />
                </label>

                <label>
                  End year
                  <input
                    className="input"
                    inputMode="numeric"
                    value={e.end_year}
                    onChange={(x) =>
                      updateExp(
                        i,
                        "end_year",
                        x.target.value
                      )
                    }
                  />
                </label>
              </div>
            </div>
          ))}

          <button
            className="addRowBtn"
            onClick={() =>
              setExperience((v) => [...v, emptyExp()])
            }
          >
            + Add previous experience
          </button>

          <div className="wizardActions">
            <button
              className="btn btnLight"
              onClick={() => setStep(3)}
            >
              ← Back
            </button>

            <button
              className="btn btnPrimary"
              onClick={() => {
                if (finalCareer) {
                  setMessage("");
                  setStep(5);
                } else {
                  setMessage(
                    "Choose a career field or select Other."
                  );
                }
              }}
            >
              Continue →
            </button>
          </div>
        </section>
      )}

      {step === 5 && (
        <section className="wizardSection">
          <h2>Connect with the Herzliah community</h2>

          <p className="intro">
            Tell alumni what kinds of conversations and
            opportunities you&apos;re open to.
          </p>

          <div className="choiceGrid">
            {HELP_OPTIONS.map(([k, l]) => (
              <label className="choice" key={k}>
                <input
                  type="checkbox"
                  checked={Boolean(
                    form[k as keyof typeof form]
                  )}
                  onChange={(e) =>
                    updateForm(k, e.target.checked)
                  }
                />

                {l}
              </label>
            ))}
          </div>

          <h3>What can people reach out to you about?</h3>

          <textarea
            className="input"
            rows={4}
            placeholder="Example: Happy to answer questions about medical school, healthcare careers, entrepreneurship, working in Montreal, or McGill."
            value={form.contact_topics}
            onChange={(e) =>
              updateForm("contact_topics", e.target.value)
            }
          />

          <h3>Privacy</h3>

          <div className="choiceGrid">
            <label className="choice">
              <input
                type="checkbox"
                checked={form.is_directory_visible}
                onChange={(e) =>
                  updateForm(
                    "is_directory_visible",
                    e.target.checked
                  )
                }
              />

              Show my profile in the verified alumni Directory
            </label>

            <label className="choice">
              <input
                type="checkbox"
                checked={form.contact_allowed}
                onChange={(e) =>
                  updateForm(
                    "contact_allowed",
                    e.target.checked
                  )
                }
              />

              Allow verified alumni to contact me
            </label>

            <label className="choice">
              <input
                type="checkbox"
                checked={form.student_contact_allowed}
                onChange={(e) =>
                  updateForm(
                    "student_contact_allowed",
                    e.target.checked
                  )
                }
              />

              Allow verified Herzliah students to contact me
            </label>
          </div>

          <h3>Review</h3>

          <div className="reviewGrid">
            <div className="reviewBox">
              <h4>Herzliah</h4>
              <p>Class of {form.grad_year || "—"}</p>
              <p>
                {form.current_city || "—"},{" "}
                {form.current_country || "—"}
              </p>
            </div>

            <div className="reviewBox">
              <h4>Career</h4>
              <p>
                {form.job_title || "—"}
                {form.current_employer
                  ? ` at ${form.current_employer}`
                  : ""}
              </p>
              <p>{finalCareer || "—"}</p>
            </div>

            <div className="reviewBox">
              <h4>Education</h4>
              <p>
                {education
                  .filter((x) => x.school)
                  .map((x) => x.school)
                  .join(" · ") || "None added"}
              </p>
            </div>

            <div className="reviewBox">
              <h4>Languages</h4>
              <p>{form.languages || "None added"}</p>
            </div>
          </div>

          <div className="wizardActions">
            <button
              className="btn btnLight"
              onClick={() => setStep(4)}
            >
              ← Back
            </button>

            <button
              className="btn btnPrimary"
              onClick={finish}
            >
              Save & complete my profile
            </button>
          </div>
        </section>
      )}

      {message && (
        <div className="notice">{message}</div>
      )}
    </div>
  );
}
