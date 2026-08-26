"use client";
import {useMemo,useState} from "react";
import Link from "next/link";

type P={id:string;first_name:string;last_name:string;grad_year:number|null;profession:string|null;job_title:string|null;current_employer:string|null;current_city:string|null;claimed_at:string|null;is_directory_visible:boolean};

export function AdminAlumniBrowser({profiles}:{profiles:P[]}){
  const[q,setQ]=useState("");const[status,setStatus]=useState("");
  const shown=useMemo(()=>profiles.filter(p=>{
    const h=[p.first_name,p.last_name,p.grad_year,p.profession,p.job_title,p.current_employer,p.current_city].join(" ").toLowerCase();
    return (!q||h.includes(q.toLowerCase()))&&(!status||(status==="claimed"?Boolean(p.claimed_at):!p.claimed_at));
  }),[profiles,q,status]);
  return <div>
    <div className="adminSearchBar"><input className="input" placeholder="Search all alumni by name, class, career, employer or city…" value={q} onChange={e=>setQ(e.target.value)}/><select className="input" style={{maxWidth:180}} value={status} onChange={e=>setStatus(e.target.value)}><option value="">All statuses</option><option value="claimed">Claimed</option><option value="unclaimed">Unclaimed</option></select></div>
    <div className="adminAlumniList"><table className="table"><thead><tr><th>Name</th><th>Class</th><th>Career</th><th>Location</th><th>Status</th><th></th></tr></thead><tbody>{shown.map(p=><tr key={p.id}><td><div className="adminName">{p.first_name} {p.last_name}</div><div className="adminMeta">{p.job_title||""}{p.current_employer?` · ${p.current_employer}`:""}</div></td><td>{p.grad_year||"—"}</td><td>{p.profession||"—"}</td><td>{p.current_city||"—"}</td><td><span className={`status ${p.claimed_at?"claimed":"unclaimed"}`}>{p.claimed_at?"Claimed":"Unclaimed"}</span></td><td>{p.claimed_at?<Link href={`/profile/${p.id}`}>View →</Link>:"—"}</td></tr>)}</tbody></table></div>
    <div className="directoryMeta"><strong>{shown.length}</strong> of {profiles.length} alumni</div>
  </div>;
}
