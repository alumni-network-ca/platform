"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLanguage } from "./LanguageProvider";

type Availability = {
  mentoring?: boolean;
  career_advice?: boolean;
  job_opportunities?: boolean;
  offering_jobs?: boolean;
  offering_internships?: boolean;
  shadowing?: boolean;
  speaking?: boolean;
  networking?: boolean;
  entrepreneurship?: boolean;
};

type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  grad_year: number | null;
  profession: string | null;
  current_employer: string | null;
  job_title: string | null;
  current_city: string | null;
  current_country?: string | null;
  universities?: string[] | null;
  availability_flags?: Availability[] | Availability | null;
};

function flagsFor(p: Profile): Availability {
  if (Array.isArray(p.availability_flags)) {
    return p.availability_flags[0] || {};
  }

  return p.availability_flags || {};
}

export function DirectoryClient({ profiles }: { profiles: Profile[] }) {
  const { locale } = useLanguage();

  const text =
    locale === "fr"
      ? {
          searchPlaceholder:
            "Rechercher une personne, un employeur, un domaine, une université ou une ville…",

          reset: "Réinitialiser",

          careerField: "Domaine professionnel",
          allCareerFields: "Tous les domaines",

          university: "Université",
          allUniversities: "Toutes les universités",

          location: "Lieu",
          allLocations: "Tous les lieux",

          herzliahClass: "Promotion Herzliah",
          allClasses: "Toutes les promotions",
          classOf: "Promotion",

          openTo: "Disponible pour",
          anything: "Toutes les options",

          mentoring: "Mentorat",
          careerAdvice: "Conseils de carrière",
          jobOpportunities: "Recherche d’opportunités",
          hiring: "Recrutement",
          internships: "Stages",
          shadowing: "Observation professionnelle",
          speaking: "Conférences",
          networking: "Réseautage",
          entrepreneurship: "Entrepreneuriat",

          sortBy: "Trier par",
          lastName: "Nom de famille",
          graduationYear: "Année de graduation",

          alumniShown: "anciens affichés",
          totalProfiles: "profils au total",

          noMatches: "Aucun résultat",
          tryClearing: "Essayez de supprimer un ou plusieurs filtres.",
          clearFilters: "Effacer les filtres",

          herzliahAlumnus: "Ancien de Herzliah",
          viewProfile: "Voir le profil",
        }
      : {
          searchPlaceholder: "Search people, employers, career fields, schools or cities…",

          reset: "Reset",

          careerField: "Career field",
          allCareerFields: "All career fields",

          university: "University",
          allUniversities: "All universities",

          location: "Location",
          allLocations: "All locations",

          herzliahClass: "Herzliah class",
          allClasses: "All classes",
          classOf: "Class of",

          openTo: "Open to",
          anything: "Anything",

          mentoring: "Mentoring",
          careerAdvice: "Career advice",
          jobOpportunities: "Looking for opportunities",
          hiring: "Hiring",
          internships: "Internships",
          shadowing: "Shadowing",
          speaking: "Speaking",
          networking: "Networking",
          entrepreneurship: "Entrepreneurship",

          sortBy: "Sort by",
          lastName: "Last name",
          graduationYear: "Graduation year",

          alumniShown: "alumni shown",
          totalProfiles: "total profiles",

          noMatches: "No matches yet",
          tryClearing: "Try clearing one or more filters.",
          clearFilters: "Clear filters",

          herzliahAlumnus: "Herzliah alumnus",
          viewProfile: "View profile",
        };

  const [q, setQ] = useState("");
  const [career, setCareer] = useState("");
  const [university, setUniversity] = useState("");
  const [location, setLocation] = useState("");
  const [gradYear, setGradYear] = useState("");
  const [availability, setAvailability] = useState("");
  const [sort, setSort] = useState("name");

  const options = useMemo(
    () => ({
      careers: [...new Set(profiles.map((p) => p.profession).filter(Boolean) as string[])].sort(),

      universities: [
        ...new Set(profiles.flatMap((p) => p.universities || []).filter(Boolean)),
      ].sort(),

      locations: [
        ...new Set(profiles.map((p) => p.current_city).filter(Boolean) as string[]),
      ].sort(),

      years: [...new Set(profiles.map((p) => p.grad_year).filter(Boolean) as number[])].sort(
        (a, b) => b - a,
      ),
    }),
    [profiles],
  );

  const shown = useMemo(() => {
    const query = q.trim().toLowerCase();

    const filtered = profiles.filter((p) => {
      const hay = [
        p.first_name,
        p.last_name,
        p.profession,
        p.current_employer,
        p.job_title,
        p.current_city,
        p.current_country,
        p.grad_year,
        ...(p.universities || []),
      ]
        .join(" ")
        .toLowerCase();

      const flags = flagsFor(p);

      return (
        (!query || hay.includes(query)) &&
        (!career || p.profession === career) &&
        (!university || (p.universities || []).includes(university)) &&
        (!location || p.current_city === location) &&
        (!gradYear || p.grad_year === Number(gradYear)) &&
        (!availability || Boolean(flags[availability as keyof Availability]))
      );
    });

    return [...filtered].sort((a, b) =>
      sort === "year"
        ? (b.grad_year || 0) - (a.grad_year || 0)
        : `${a.last_name}${a.first_name}`.localeCompare(`${b.last_name}${b.first_name}`),
    );
  }, [profiles, q, career, university, location, gradYear, availability, sort]);

  function reset() {
    setQ("");
    setCareer("");
    setUniversity("");
    setLocation("");
    setGradYear("");
    setAvailability("");
    setSort("name");
  }

  function availabilityLabel(key: string) {
    const labels: Record<string, string> = {
      mentoring: text.mentoring,
      career_advice: text.careerAdvice,
      job_opportunities: text.jobOpportunities,
      offering_jobs: text.hiring,
      offering_internships: text.internships,
      shadowing: text.shadowing,
      speaking: text.speaking,
      networking: text.networking,
      entrepreneurship: text.entrepreneurship,
    };

    return labels[key] || key;
  }

  return (
    <>
      <div className="directoryToolbar">
        <div className="searchbar">
          <span>⌕</span>

          <input
            placeholder={text.searchPlaceholder}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <button className="btn btnLight" onClick={reset}>
          {text.reset}
        </button>
      </div>

      <div className="filterPanel">
        <label>
          {text.careerField}

          <select value={career} onChange={(e) => setCareer(e.target.value)}>
            <option value="">{text.allCareerFields}</option>

            {options.careers.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>

        <label>
          {text.university}

          <select value={university} onChange={(e) => setUniversity(e.target.value)}>
            <option value="">{text.allUniversities}</option>

            {options.universities.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>

        <label>
          {text.location}

          <select value={location} onChange={(e) => setLocation(e.target.value)}>
            <option value="">{text.allLocations}</option>

            {options.locations.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>

        <label>
          {text.herzliahClass}

          <select value={gradYear} onChange={(e) => setGradYear(e.target.value)}>
            <option value="">{text.allClasses}</option>

            {options.years.map((x) => (
              <option key={x} value={x}>
                {text.classOf} {x}
              </option>
            ))}
          </select>
        </label>

        <label>
          {text.openTo}

          <select value={availability} onChange={(e) => setAvailability(e.target.value)}>
            <option value="">{text.anything}</option>

            <option value="mentoring">{text.mentoring}</option>

            <option value="career_advice">{text.careerAdvice}</option>

            <option value="job_opportunities">{text.jobOpportunities}</option>

            <option value="offering_jobs">{text.hiring}</option>

            <option value="offering_internships">{text.internships}</option>

            <option value="shadowing">{text.shadowing}</option>

            <option value="speaking">{text.speaking}</option>

            <option value="networking">{text.networking}</option>

            <option value="entrepreneurship">{text.entrepreneurship}</option>
          </select>
        </label>

        <label>
          {text.sortBy}

          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="name">{text.lastName}</option>

            <option value="year">{text.graduationYear}</option>
          </select>
        </label>
      </div>

      <div className="directoryMeta">
        <strong>{shown.length}</strong> {text.alumniShown}
        <span> · </span>
        <span>
          {profiles.length} {text.totalProfiles}
        </span>
      </div>

      <div className="profileGrid">
        {shown.length === 0 ? (
          <div className="emptyState">
            <h3>{text.noMatches}</h3>

            <p>{text.tryClearing}</p>

            <button className="btn btnPrimary" onClick={reset}>
              {text.clearFilters}
            </button>
          </div>
        ) : (
          shown.map((p) => {
            const flags = flagsFor(p);

            const tagKeys = [
              flags.mentoring && "mentoring",
              flags.career_advice && "career_advice",
              flags.offering_internships && "offering_internships",
              flags.offering_jobs && "offering_jobs",
              flags.shadowing && "shadowing",
            ].filter(Boolean) as string[];

            return (
              <Link className="profileCard" key={p.id} href={`/profile/${p.id}`}>
                <div className="profileCardTop">
                  <div className="avatar avatarInitials">
                    {p.first_name?.[0] || ""}
                    {p.last_name?.[0] || ""}
                  </div>

                  <div className="yearBadge">{p.grad_year || "—"}</div>
                </div>

                <h3>
                  {p.first_name} {p.last_name} <span className="verified">✓</span>
                </h3>

                <div className="profileRole">
                  {p.job_title || p.profession || text.herzliahAlumnus}
                </div>

                <div className="profileCompany">{p.current_employer || ""}</div>

                <div className="profileLocation">
                  {p.current_city || ""}

                  {p.current_country ? `, ${p.current_country}` : ""}
                </div>

                <div className="tagRow">
                  {tagKeys.slice(0, 3).map((tag) => (
                    <span key={tag} className="pill">
                      {availabilityLabel(tag)}
                    </span>
                  ))}
                </div>

                <div className="viewProfile">{text.viewProfile} →</div>
              </Link>
            );
          })
        )}
      </div>
    </>
  );
}
