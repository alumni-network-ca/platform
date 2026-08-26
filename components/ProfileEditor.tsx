"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Flags = { mentoring:boolean;career_advice:boolean;job_opportunities:boolean;offering_jobs:boolean;offering_internships:boolean;shadowing:boolean;speaking:boolean;networking:boolean;entrepreneurship:boolean };
type Profile = {
  id:string;institution_id:string;first_name:string;last_name:string;grad_year:number|null;bio:string|null;current_city:string|null;current_country:string|null;
  current_employer:string|null;job_title:string|null;profession:string|null;industry:string|null;universities:string[];degrees:string[];languages:string[];
  linkedin_url:string|null;website_url:string|null;privacy_preset:string;contact_allowed:boolean;is_directory_visible:boolean;last_confirmed_at:string|null;
};
export function ProfileEditor({profile,flags}:{profile:Profile;flags:Partial<Flags>}){
  const[f,setF]=useState({...profile,universities:(profile.universities||[]).join(", "),degrees:(profile.degrees||[]).join(", "),languages:(profile.languages||[]).join(", ")});
  const[a,setA]=useState<Flags>({mentoring:false,career_advice:false,job_opportunities:false,offering_jobs:false,offering_internships:false,shadowing:false,speaking:false,networking:false,entrepreneurship:false,...flags});
  const[message,setMessage]=useState("");
  const[saving,setSaving]=useState(false);
  const completeness=useMemo(()=>Math.round(([f.first_name,f.last_name,f.grad_year,f.profession,f.current_employer,f.current_city,f.bio,f.universities].filter(Boolean).length/8)*100),[f]);

  async function save(){
    setSaving(true);setMessage("");
    const supabase=createClient();
    const {error}=await supabase.from("alumni_profiles").update({
      first_name:f.first_name,last_name:f.last_name,grad_year:f.grad_year?Number(f.grad_year):null,bio:f.bio||null,
      current_city:f.current_city||null,current_country:f.current_country||null,current_employer:f.current_employer||null,
      job_title:f.job_title||null,profession:f.profession||null,industry:f.industry||null,
      universities:String(f.universities).split(",").map(x=>x.trim()).filter(Boolean),degrees:String(f.degrees).split(",").map(x=>x.trim()).filter(Boolean),
      languages:String(f.languages).split(",").map(x=>x.trim()).filter(Boolean),linkedin_url:f.linkedin_url||null,website_url:f.website_url||null,
      privacy_preset:f.privacy_preset,contact_allowed:f.contact_allowed,is_directory_visible:f.is_directory_visible,last_confirmed_at:new Date().toISOString()
    }).eq("id",profile.id);
    if(error){setSaving(false);setMessage(error.message);return;}
    const {error:flagError}=await supabase.from("availability_flags").upsert({profile_id:profile.id,institution_id:profile.institution_id,...a});
    setSaving(false);setMessage(flagError?flagError.message:"Profile saved. Your information is now confirmed as current.");
  }

  return <div className="profileEditLayout">
    <div>
      <div className="profileSummary card"><div className="avatar avatarInitials profileAvatar">{f.first_name?.[0]}{f.last_name?.[0]}</div><div><div className="eyebrow">My profile</div><h1>{f.first_name} {f.last_name}</h1><p className="muted">{f.job_title||f.profession||"Add your professional role"}{f.current_employer?` · ${f.current_employer}`:""}</p></div><div className="completion"><strong>{completeness}%</strong><span>complete</span></div></div>
      <section className="editorSection card"><h2>Professional profile</h2><div className="formGrid">
        <label>First name<input className="input" value={f.first_name} onChange={e=>setF({...f,first_name:e.target.value})}/></label>
        <label>Last name<input className="input" value={f.last_name} onChange={e=>setF({...f,last_name:e.target.value})}/></label>
        <label>Graduation year<input className="input" value={f.grad_year||""} onChange={e=>setF({...f,grad_year:Number(e.target.value)||null})}/></label>
        <label>Profession<input className="input" value={f.profession||""} onChange={e=>setF({...f,profession:e.target.value})}/></label>
        <label>Job title<input className="input" value={f.job_title||""} onChange={e=>setF({...f,job_title:e.target.value})}/></label>
        <label>Employer<input className="input" value={f.current_employer||""} onChange={e=>setF({...f,current_employer:e.target.value})}/></label>
        <label>Industry<input className="input" value={f.industry||""} onChange={e=>setF({...f,industry:e.target.value})}/></label>
        <label>City<input className="input" value={f.current_city||""} onChange={e=>setF({...f,current_city:e.target.value})}/></label>
        <label>Country<input className="input" value={f.current_country||""} onChange={e=>setF({...f,current_country:e.target.value})}/></label>
        <label>LinkedIn<input className="input" value={f.linkedin_url||""} onChange={e=>setF({...f,linkedin_url:e.target.value})}/></label>
        <label className="full">About<textarea className="input" rows={5} value={f.bio||""} onChange={e=>setF({...f,bio:e.target.value})}/></label>
        <label className="full">Universities <small>comma separated</small><input className="input" value={String(f.universities)} onChange={e=>setF({...f,universities:e.target.value as never})}/></label>
        <label className="full">Degrees <small>comma separated</small><input className="input" value={String(f.degrees)} onChange={e=>setF({...f,degrees:e.target.value as never})}/></label>
        <label className="full">Languages <small>comma separated</small><input className="input" value={String(f.languages)} onChange={e=>setF({...f,languages:e.target.value as never})}/></label>
      </div></section>
      <section className="editorSection card"><h2>How I can help</h2><p className="muted">These settings power Directory filters. Alumni only see opportunities you've explicitly opted into.</p><div className="choiceGrid">
        {([["mentoring","Mentoring"],["career_advice","Career advice"],["job_opportunities","Open to job opportunities"],["offering_jobs","Hiring"],["offering_internships","Offering internships"],["shadowing","Shadowing"],["speaking","Speaking & panels"],["networking","Networking"],["entrepreneurship","Entrepreneurship"]] as const).map(([k,l])=><label className="choice" key={k}><input type="checkbox" checked={a[k]} onChange={e=>setA({...a,[k]:e.target.checked})}/>{l}</label>)}
      </div></section>
    </div>
    <aside>
      <div className="sideCard stickyCard"><h3>Privacy & visibility</h3>
        <label className="switchRow"><span><strong>Directory visibility</strong><small>Show this profile to verified Herzliah members.</small></span><input type="checkbox" checked={f.is_directory_visible} onChange={e=>setF({...f,is_directory_visible:e.target.checked})}/></label>
        <label className="switchRow"><span><strong>Allow contact</strong><small>Let other verified members contact you.</small></span><input type="checkbox" checked={f.contact_allowed} onChange={e=>setF({...f,contact_allowed:e.target.checked})}/></label>
        <label className="fieldLabel">Profile access<select className="input" value={f.privacy_preset} onChange={e=>setF({...f,privacy_preset:e.target.value})}><option value="alumni_only">Verified alumni</option><option value="admins_only">Herzliah admins only</option><option value="hidden">Hidden</option></select></label>
        <button className="btn btnPrimary btnWide" onClick={save} disabled={saving}>{saving?"Saving…":"Save & confirm profile"}</button>
        {message&&<div className="notice">{message}</div>}
        <p className="microcopy">Last confirmed: {f.last_confirmed_at?new Date(f.last_confirmed_at).toLocaleDateString():"Not yet"}</p>
      </div>
    </aside>
  </div>;
}
