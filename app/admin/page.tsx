import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {AdminImport} from "@/components/AdminImport";
import {AdminAlumniBrowser} from "@/components/AdminAlumniBrowser";
import {Nav} from "@/components/Nav";

export default async function AdminPage(){
 const supabase=await createClient();const{data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login?next=/admin");
 const{data:m}=await supabase.from("institution_memberships").select("institution_id,role").eq("user_id",user.id).in("role",["institution_admin","super_admin"]).maybeSingle();
 if(!m)return <><Nav/><main className="page"><div className="notice">No administrator access.</div></main></>;
 const id=m.institution_id;
 const[{count:all},{count:claimed},{count:unclaimed},{count:requests},{data:profiles},{data:access}]=await Promise.all([
  supabase.from("alumni_profiles").select("*",{count:"exact",head:true}).eq("institution_id",id),
  supabase.from("alumni_profiles").select("*",{count:"exact",head:true}).eq("institution_id",id).not("claimed_at","is",null),
  supabase.from("alumni_profiles").select("*",{count:"exact",head:true}).eq("institution_id",id).is("claimed_at",null),
  supabase.from("access_requests").select("*",{count:"exact",head:true}).or(`institution_id.eq.${id},institution_id.is.null`).eq("status","pending"),
  supabase.from("alumni_profiles").select("id,first_name,last_name,grad_year,profession,job_title,current_employer,current_city,claimed_at,is_directory_visible").eq("institution_id",id).order("last_name"),
  supabase.from("access_requests").select("id,email,first_name,last_name,grad_year,status,created_at").or(`institution_id.eq.${id},institution_id.is.null`).order("created_at",{ascending:false}).limit(20)
 ]);
 return <><Nav/><div className="adminLayout"><aside className="adminSide"><div className="eyebrow">Herzliah</div><a href="#overview">Overview</a><a href="#alumni">All alumni</a><a href="#imports">Imports</a><a href="#requests">Verification requests</a></aside><main className="adminMain">
  <div id="overview" className="eyebrow">Institution admin</div><h1>Community dashboard</h1>
  <div className="statCards"><div className="statCard"><strong>{all??0}</strong><span>Total records</span></div><div className="statCard"><strong>{claimed??0}</strong><span>Claimed</span></div><div className="statCard"><strong>{unclaimed??0}</strong><span>Unclaimed</span></div><div className="statCard"><strong>{requests??0}</strong><span>Verification requests</span></div></div>
  <section id="alumni" className="card" style={{marginTop:24}}><h2 style={{marginTop:0}}>All alumni</h2><p className="muted">Search and review the complete Herzliah alumni database, not only recently added records.</p><AdminAlumniBrowser profiles={profiles||[]}/></section>
  <section id="imports"><AdminImport institutionId={id}/></section>
  <section id="requests" className="card" style={{marginTop:24}}><h2 style={{marginTop:0}}>Verification requests</h2>{!access?.length?<p className="muted">No requests yet.</p>:<table className="table"><thead><tr><th>Alumnus</th><th>Class</th><th>Status</th></tr></thead><tbody>{access.map(r=><tr key={r.id}><td>{r.first_name||r.email} {r.last_name||""}<small style={{display:"block",color:"var(--slate)"}}>{r.email}</small></td><td>{r.grad_year||"—"}</td><td><span className="status unclaimed">{r.status}</span></td></tr>)}</tbody></table>}</section>
 </main></div></>;
}
