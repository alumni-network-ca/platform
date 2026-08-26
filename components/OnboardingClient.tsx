"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = { isAdmin:boolean; institutionId:string | null; email:string };

export function OnboardingClient({isAdmin,institutionId,email}:Props){
  const router=useRouter();
  const[step,setStep]=useState(1);
  const[message,setMessage]=useState("");
  const[form,setForm]=useState({
    first_name:"",last_name:"",grad_year:"",profession:"",job_title:"",industry:"",
    current_employer:"",current_city:"Montreal",current_country:"Canada",bio:"",
    universities:"",degrees:"",languages:"English, French",
    linkedin_url:"",website_url:"",
    mentoring:false,career_advice:false,offering_internships:false,offering_jobs:false,
    shadowing:false,speaking:false,networking:true,entrepreneurship:false,
    is_directory_visible:true,contact_allowed:true,privacy_preset:"alumni_only"
  });

  function change(name:string,value:unknown){setForm(v=>({...v,[name]:value}));}

  async function tryClaim(){
    const supabase=createClient();
    const {data,error}=await supabase.rpc("claim_my_profile");
    if(error){setMessage(error.message);return;}
    if(data){router.replace("/me?welcome=1");router.refresh();return;}
    if(isAdmin){setStep(2);setMessage("No alumni record matched your account email. As an administrator, you can create your own profile below.");}
    else {setStep(3);setMessage("We couldn't automatically match your signed-in email to an alumni record. Submit a verification request and Herzliah can approve it.");}
  }

  async function createAdminProfile(){
    if(!institutionId){setMessage("Your institution membership could not be found.");return;}
    if(!form.first_name||!form.last_name||!form.grad_year){setMessage("First name, last name and graduation year are required.");return;}
    const supabase=createClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){router.replace("/login");return;}
    const {data:p,error}=await supabase.from("alumni_profiles").insert({
      institution_id:institutionId,user_id:user.id,claim_email:email,
      first_name:form.first_name,last_name:form.last_name,grad_year:Number(form.grad_year),
      profession:form.profession||null,job_title:form.job_title||null,industry:form.industry||null,
      current_employer:form.current_employer||null,current_city:form.current_city||null,current_country:form.current_country||null,
      bio:form.bio||null,universities:form.universities.split(",").map(x=>x.trim()).filter(Boolean),
      degrees:form.degrees.split(",").map(x=>x.trim()).filter(Boolean),languages:form.languages.split(",").map(x=>x.trim()).filter(Boolean),
      linkedin_url:form.linkedin_url||null,website_url:form.website_url||null,
      privacy_preset:form.privacy_preset,contact_allowed:form.contact_allowed,is_directory_visible:form.is_directory_visible,
      claimed_at:new Date().toISOString(),last_confirmed_at:new Date().toISOString()
    }).select("id").single();
    if(error){setMessage(error.message);return;}
    await supabase.from("availability_flags").upsert({
      profile_id:p.id,institution_id:institutionId,mentoring:form.mentoring,career_advice:form.career_advice,
      offering_internships:form.offering_internships,offering_jobs:form.offering_jobs,shadowing:form.shadowing,
      speaking:form.speaking,networking:form.networking,entrepreneurship:form.entrepreneurship
    });
    router.replace("/me?welcome=1");router.refresh();
  }

  async function requestVerification(){
    const supabase=createClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){router.replace("/login");return;}
    const {error}=await supabase.from("access_requests").insert({
      user_id:user.id,email,first_name:form.first_name||null,last_name:form.last_name||null,
      grad_year:form.grad_year?Number(form.grad_year):null,note:form.bio||null
    });
    setMessage(error?error.message:"Verification request submitted. Herzliah staff can review it from the admin dashboard.");
  }

  return <div className="onboardingCard">
    <div className="onboardingProgress"><span className={step>=1?"on":""}>Account</span><i/><span className={step>=2?"on":""}>Profile</span><i/><span className={step>=3?"on":""}>Verification</span></div>
    {step===1&&<section><div className="eyebrow">Welcome to Herzliah Alumni Network</div><h1>Let's connect your account.</h1>
      <p className="muted">You're signed in as <strong>{email}</strong>. We'll first try to match that email to the private alumni record Herzliah has on file.</p>
      <button className="btn btnPrimary" onClick={tryClaim}>Match my alumni record</button></section>}
    {step===2&&<section><div className="eyebrow">Build your profile</div><h1>Tell the network who you are.</h1>
      <div className="formGrid">
        <label>First name<input className="input" value={form.first_name} onChange={e=>change("first_name",e.target.value)}/></label>
        <label>Last name<input className="input" value={form.last_name} onChange={e=>change("last_name",e.target.value)}/></label>
        <label>Graduation year<input className="input" inputMode="numeric" value={form.grad_year} onChange={e=>change("grad_year",e.target.value)}/></label>
        <label>Profession<input className="input" value={form.profession} onChange={e=>change("profession",e.target.value)}/></label>
        <label>Job title<input className="input" value={form.job_title} onChange={e=>change("job_title",e.target.value)}/></label>
        <label>Employer<input className="input" value={form.current_employer} onChange={e=>change("current_employer",e.target.value)}/></label>
        <label>Industry<input className="input" value={form.industry} onChange={e=>change("industry",e.target.value)}/></label>
        <label>City<input className="input" value={form.current_city} onChange={e=>change("current_city",e.target.value)}/></label>
        <label className="full">About<textarea className="input" rows={4} value={form.bio} onChange={e=>change("bio",e.target.value)}/></label>
        <label className="full">Universities <small>comma separated</small><input className="input" value={form.universities} onChange={e=>change("universities",e.target.value)}/></label>
        <label className="full">Degrees <small>comma separated</small><input className="input" value={form.degrees} onChange={e=>change("degrees",e.target.value)}/></label>
      </div>
      <h3>What are you open to?</h3><div className="choiceGrid">
        {([["mentoring","Mentoring"],["career_advice","Career advice"],["offering_internships","Offering internships"],["offering_jobs","Hiring"],["shadowing","Shadowing"],["speaking","Speaking & panels"],["networking","Networking"],["entrepreneurship","Entrepreneurship"]] as const).map(([k,l])=><label key={k} className="choice"><input type="checkbox" checked={Boolean(form[k])} onChange={e=>change(k,e.target.checked)}/>{l}</label>)}
      </div>
      <h3>Privacy</h3><div className="choiceGrid"><label className="choice"><input type="checkbox" checked={form.is_directory_visible} onChange={e=>change("is_directory_visible",e.target.checked)}/>Show me in the verified alumni directory</label><label className="choice"><input type="checkbox" checked={form.contact_allowed} onChange={e=>change("contact_allowed",e.target.checked)}/>Allow members to contact me</label></div>
      <button className="btn btnPrimary" onClick={createAdminProfile}>Create my profile</button></section>}
    {step===3&&<section><div className="eyebrow">Manual verification</div><h1>Request alumni verification.</h1>
      <p className="muted">This handles alumni whose current email doesn't match Herzliah's historic records.</p>
      <div className="formGrid"><label>First name<input className="input" value={form.first_name} onChange={e=>change("first_name",e.target.value)}/></label><label>Last name<input className="input" value={form.last_name} onChange={e=>change("last_name",e.target.value)}/></label><label>Graduation year<input className="input" value={form.grad_year} onChange={e=>change("grad_year",e.target.value)}/></label><label className="full">Anything that helps Herzliah verify you<textarea className="input" rows={4} value={form.bio} onChange={e=>change("bio",e.target.value)}/></label></div>
      <button className="btn btnPrimary" onClick={requestVerification}>Submit verification request</button></section>}
    {message&&<div className="notice">{message}</div>}
  </div>;
}
