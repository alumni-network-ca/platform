import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";

const labels: Record<string,string> = {mentoring:"Mentoring",career_advice:"Career advice",job_opportunities:"Open to opportunities",offering_jobs:"Hiring",offering_internships:"Offering internships",shadowing:"Shadowing",speaking:"Speaking & panels",networking:"Networking",entrepreneurship:"Entrepreneurship"};

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: p } = await supabase.from("alumni_profiles").select("*,availability_flags(*)").eq("id", id).single();
  if (!p) notFound();
  const rawFlags = Array.isArray(p.availability_flags) ? p.availability_flags[0] : p.availability_flags;
  const active = rawFlags ? Object.entries(labels).filter(([key]) => rawFlags[key]) : [];

  return <><Nav/><main className="page" style={{maxWidth:980}}>
    <Link href="/directory" className="muted" style={{fontSize:13}}>← Back to directory</Link>
    <div style={{display:"flex",gap:20,alignItems:"center",margin:"28px 0"}}><div className="avatar avatarInitials" style={{width:92,height:92,fontSize:22}}>{p.first_name[0]}{p.last_name[0]}</div><div style={{flex:1}}><h1 style={{marginBottom:8}}>{p.first_name} {p.last_name} <span className="verified">✓</span></h1><div style={{fontWeight:700}}>{p.job_title || p.profession || "Herzliah alumnus"}{p.current_employer ? ` · ${p.current_employer}` : ""}</div><div className="muted" style={{marginTop:7}}>{p.current_city || ""}{p.current_country ? `, ${p.current_country}` : ""}{p.grad_year ? ` · Class of ${p.grad_year}` : ""}</div></div>{p.grad_year && <div className="year" style={{fontSize:18,padding:14}}>Class of<br/><strong>{p.grad_year}</strong></div>}</div>
    <div className="twoCol"><div><div className="card" style={{marginBottom:18}}><h3>About</h3><p className="muted">{p.bio || "This alumnus has not added a biography yet."}</p></div><div className="card"><h3>Professional & education background</h3><p className="muted"><strong>{p.profession || ""}</strong>{p.industry ? ` · ${p.industry}` : ""}</p><p className="muted">{[...(p.universities || []), ...(p.degrees || [])].join(" · ") || "No education details added yet."}</p></div></div><aside><div className="sideCard"><h3>Open to helping with</h3>{active.length ? active.map(([,label])=><div key={label} style={{padding:"7px 0",fontSize:13}}>● {label}</div>) : <p className="muted">No availability preferences selected.</p>}</div><div className="sideCard"><h3>Profile freshness</h3><p className="muted">{p.last_confirmed_at ? `Confirmed ${new Date(p.last_confirmed_at).toLocaleDateString()}` : "Not yet reconfirmed."}</p></div></aside></div>
  </main></>;
}
