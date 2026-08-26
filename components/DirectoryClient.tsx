"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Availability = {
  mentoring?: boolean; career_advice?: boolean; job_opportunities?: boolean;
  offering_jobs?: boolean; offering_internships?: boolean; shadowing?: boolean;
  speaking?: boolean; networking?: boolean; entrepreneurship?: boolean;
};

type Profile = {
  id: string; first_name: string; last_name: string; grad_year: number | null;
  profession: string | null; industry: string | null; current_employer: string | null;
  job_title: string | null; current_city: string | null; current_country?: string | null;
  availability_flags?: Availability[] | Availability | null;
};

function flagsFor(p: Profile): Availability {
  if (Array.isArray(p.availability_flags)) return p.availability_flags[0] || {};
  return p.availability_flags || {};
}

export function DirectoryClient({ profiles, initialAvailability = "" }: { profiles: Profile[]; initialAvailability?: string }) {
  const [q, setQ] = useState("");
  const [profession, setProfession] = useState("");
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");
  const [decade, setDecade] = useState("");
  const [availability, setAvailability] = useState(initialAvailability);
  const [sort, setSort] = useState("name");

  const options = useMemo(() => ({
    professions: [...new Set(profiles.map(p => p.profession).filter(Boolean) as string[])].sort(),
    industries: [...new Set(profiles.map(p => p.industry).filter(Boolean) as string[])].sort(),
    locations: [...new Set(profiles.map(p => p.current_city).filter(Boolean) as string[])].sort(),
    decades: [...new Set(profiles.map(p => p.grad_year ? `${Math.floor(p.grad_year / 10) * 10}s` : null).filter(Boolean) as string[])].sort(),
  }), [profiles]);

  const shown = useMemo(() => {
    const query = q.trim().toLowerCase();
    const result = profiles.filter(p => {
      const hay = [p.first_name,p.last_name,p.profession,p.industry,p.current_employer,p.job_title,p.current_city,p.current_country,p.grad_year].join(" ").toLowerCase();
      const flags = flagsFor(p);
      const decadeMatch = !decade || (p.grad_year && Math.floor(p.grad_year / 10) * 10 === Number(decade.slice(0,4)));
      const availabilityMatch = !availability || Boolean(flags[availability as keyof Availability]);
      return (!query || hay.includes(query)) && (!profession || p.profession === profession) && (!industry || p.industry === industry) && (!location || p.current_city === location) && decadeMatch && availabilityMatch;
    });
    return [...result].sort((a,b) => sort === "year" ? (b.grad_year || 0) - (a.grad_year || 0) : `${a.last_name}${a.first_name}`.localeCompare(`${b.last_name}${b.first_name}`));
  }, [profiles,q,profession,industry,location,decade,availability,sort]);

  function reset() { setQ(""); setProfession(""); setIndustry(""); setLocation(""); setDecade(""); setAvailability(""); setSort("name"); }

  return (
    <>
      <div className="directoryToolbar">
        <div className="searchbar"><span>⌕</span><input placeholder="Search name, profession, company, city or graduating year…" value={q} onChange={e => setQ(e.target.value)} /></div>
        <button className="btn btnLight" onClick={reset}>Reset</button>
      </div>
      <div className="filterPanel">
        <label>Profession<select value={profession} onChange={e=>setProfession(e.target.value)}><option value="">All professions</option>{options.professions.map(x=><option key={x}>{x}</option>)}</select></label>
        <label>Industry<select value={industry} onChange={e=>setIndustry(e.target.value)}><option value="">All industries</option>{options.industries.map(x=><option key={x}>{x}</option>)}</select></label>
        <label>Location<select value={location} onChange={e=>setLocation(e.target.value)}><option value="">All locations</option>{options.locations.map(x=><option key={x}>{x}</option>)}</select></label>
        <label>Graduation<select value={decade} onChange={e=>setDecade(e.target.value)}><option value="">All decades</option>{options.decades.map(x=><option key={x}>{x}</option>)}</select></label>
        <label>Open to<select value={availability} onChange={e=>setAvailability(e.target.value)}><option value="">Anything</option><option value="mentoring">Mentoring</option><option value="career_advice">Career advice</option><option value="offering_internships">Internships</option><option value="offering_jobs">Hiring</option><option value="shadowing">Shadowing</option><option value="speaking">Speaking</option><option value="networking">Networking</option><option value="entrepreneurship">Entrepreneurship</option></select></label>
        <label>Sort by<select value={sort} onChange={e=>setSort(e.target.value)}><option value="name">Last name</option><option value="year">Newest class</option></select></label>
      </div>
      <div className="directoryMeta"><strong>{shown.length}</strong> alumni shown <span>·</span> <span>{profiles.length} total profiles</span></div>
      <div className="profileGrid">
        {shown.length === 0 ? <div className="emptyState"><h3>No matches yet</h3><p>Try clearing one or more filters.</p><button className="btn btnPrimary" onClick={reset}>Clear filters</button></div> : shown.map(p => {
          const flags = flagsFor(p);
          const tags = [flags.mentoring&&"Mentoring",flags.career_advice&&"Career advice",flags.offering_internships&&"Internships",flags.offering_jobs&&"Hiring",flags.shadowing&&"Shadowing"].filter(Boolean) as string[];
          return <Link className="profileCard" key={p.id} href={`/profile/${p.id}`}>
            <div className="profileCardTop"><div className="avatar avatarInitials">{p.first_name[0]}{p.last_name[0]}</div><div className="yearBadge">{p.grad_year || "—"}</div></div>
            <h3>{p.first_name} {p.last_name} <span className="verified">✓</span></h3>
            <div className="profileRole">{p.job_title || p.profession || "Herzliah alumnus"}</div>
            <div className="profileCompany">{p.current_employer || p.industry || ""}</div>
            <div className="profileLocation">{p.current_city || ""}{p.current_country ? `, ${p.current_country}` : ""}</div>
            <div className="tagRow">{tags.slice(0,3).map(t=><span key={t} className="pill">{t}</span>)}</div>
            <div className="viewProfile">View profile →</div>
          </Link>;
        })}
      </div>
    </>
  );
}
