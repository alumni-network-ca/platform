import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { ContactAlumnusButton } from "@/components/ContactAlumnusButton";
import { createClient } from "@/lib/supabase/server";

const labels: any = {
  mentoring: "Mentoring",
  career_advice: "Career advice",
  job_opportunities: "Open to opportunities",
  offering_jobs: "Hiring",
  offering_internships: "Offering internships",
  shadowing: "Shadowing",
  speaking: "Speaking & panels",
  networking: "Networking",
  entrepreneurship: "Entrepreneurship",
};

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [
    { data: p },
    { data: experience },
    { data: education },
  ] = await Promise.all([
    supabase
      .from("alumni_profiles")
      .select("*,availability_flags(*)")
      .eq("id", id)
      .single(),

    supabase
      .from("alumni_experience")
      .select("*")
      .eq("profile_id", id)
      .order("sort_order"),

    supabase
      .from("alumni_education")
      .select("*")
      .eq("profile_id", id)
      .order("sort_order"),
  ]);

  if (!p) {
    notFound();
  }

  const raw = Array.isArray(p.availability_flags)
    ? p.availability_flags[0]
    : p.availability_flags;

  const active = raw
    ? Object.entries(labels).filter(([key]) => raw[key])
    : [];

  const isOwnProfile = p.user_id === user.id;

  return (
    <>
      <Nav />

      <main
        className="page"
        style={{ maxWidth: 1000 }}
      >
        <Link
          href="/directory"
          className="muted"
        >
          ← Back to directory
        </Link>

        <div
          style={{
            display: "flex",
            gap: 20,
            alignItems: "center",
            margin: "28px 0",
          }}
        >
          <div
            className="avatar avatarInitials"
            style={{
              width: 92,
              height: 92,
              fontSize: 22,
            }}
          >
            {p.first_name?.[0] || ""}
            {p.last_name?.[0] || ""}
          </div>

          <div style={{ flex: 1 }}>
            <h1>
              {p.first_name} {p.last_name}{" "}
              <span className="verified">✓</span>
            </h1>

            <div style={{ fontWeight: 700 }}>
              {p.job_title ||
                p.profession ||
                "Herzliah alumnus"}

              {p.current_employer
                ? ` · ${p.current_employer}`
                : ""}
            </div>

            <div className="muted">
              {p.current_city || ""}

              {p.current_country
                ? `, ${p.current_country}`
                : ""}

              {p.grad_year
                ? ` · Class of ${p.grad_year}`
                : ""}
            </div>
          </div>
        </div>

        <div className="twoCol">
          <div>
            <div
              className="card"
              style={{ marginBottom: 18 }}
            >
              <h3>About</h3>

              <p className="muted">
                {p.bio || "No biography added yet."}
              </p>
            </div>

            <div
              className="card"
              style={{ marginBottom: 18 }}
            >
              <h3>Career field</h3>

              <p>
                {p.profession || "Not specified"}
              </p>
            </div>

            <div
              className="card"
              style={{ marginBottom: 18 }}
            >
              <h3>Work history</h3>

              <div className="profileTimeline">
                {experience?.length ? (
                  experience.map((x: any) => (
                    <div
                      className="timelineItem"
                      key={x.id}
                    >
                      <div className="timelineYears">
                        {x.is_current
                          ? "Current"
                          : `${x.start_year || "—"} – ${
                              x.end_year || "—"
                            }`}
                      </div>

                      <div>
                        <div className="timelineTitle">
                          {x.job_title}
                        </div>

                        <div className="timelineSub">
                          {x.employer}

                          {x.location
                            ? ` · ${x.location}`
                            : ""}

                          {x.career_field
                            ? ` · ${x.career_field}`
                            : ""}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="muted">
                    No work history added.
                  </p>
                )}
              </div>
            </div>

            <div className="card">
              <h3>Education</h3>

              <div className="profileTimeline">
                {education?.length ? (
                  education.map((x: any) => (
                    <div
                      className="timelineItem"
                      key={x.id}
                    >
                      <div className="timelineYears">
                        {x.graduation_year || ""}
                      </div>

                      <div>
                        <div className="timelineTitle">
                          {x.school}
                        </div>

                        <div className="timelineSub">
                          {[x.degree, x.field_of_study]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="muted">
                    No education added.
                  </p>
                )}
              </div>
            </div>
          </div>

          <aside>
            {!isOwnProfile &&
              p.contact_allowed && (
                <div className="sideCard">
                  <h3>Contact</h3>

                  <p className="muted">
                    Reach out to this alumnus by email.
                  </p>

                  <ContactAlumnusButton
                    profileId={p.id}
                  />
                </div>
              )}

            <div className="sideCard">
              <h3>Open to</h3>

              {active.length ? (
                active.map(([, label]: any) => (
                  <div
                    key={label}
                    style={{ padding: "7px 0" }}
                  >
                    ● {label}
                  </div>
                ))
              ) : (
                <p className="muted">
                  No preferences selected.
                </p>
              )}
            </div>

            <div className="sideCard">
              <h3>Profile freshness</h3>

              <p className="muted">
                {p.last_confirmed_at
                  ? `Confirmed ${new Date(
                      p.last_confirmed_at
                    ).toLocaleDateString()}`
                  : "Not yet confirmed."}
              </p>
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}
