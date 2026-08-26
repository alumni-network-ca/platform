import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {AdminImport} from "@/components/AdminImport";
import {Nav} from "@/components/Nav";

export default async function AdminPage(){
  const supabase=await createClient();
  const{data:{user}}=await supabase.auth.getUser();
  if(!user)redirect("/login?next=/admin");
  const{data:membership}=await supabase.from("institution_memberships").select("institution_id,role").eq("user_id",user.id).in("role",["institution_admin","super_admin"]).maybeSingle();
  if(!membership)return <><Nav/><main className="page"><div className="notice">This account does not have administrator access.</div></main></>;
  const id=membership.institution_id;
  const[{count:all},{count:claimed},{count:unclaimed},{count:requests},{data:recent},{data:access}] = await Promise.all([
    supabase.from("alumni_profiles").select("*",{count:"exact",head:true}).eq("institution_id",id),
    supabase.from("alumni_profiles").select("*",{count:"exact",head:true}).eq("institution_id",id).not("claimed_at","is",null),
    supabase.from("alumni_profiles").select("*",{count:"exact",head:true}).eq("institution_id",id).is("claimed_at",null),
    supabase.from("access_requests").select("*",{count:"exact",head:true}).or(`institution_id.eq.${id},institution_id.is.null`).eq("status","pending"),
    supabase.from("alumni_profiles").select("id,first_name,last_name,grad_year,claimed_at").eq("institution_id",id).order("created_at",{ascending:false}).limit(10),
    supabase.from("access_requests").select("id,email,first_name,last_name,grad_year,status,created_at").or(`institution_id.eq.${id},institution_id.is.null`).order("created_at",{ascending:false}).limit(8)
  ]);
  return <><Nav/><div className="adminLayout"><aside className="adminSide"><div className="eyebrow">Herzliah</div><a>Overview</a><a>Alumni</a><a>Imports</a><a>Verification requests</a><a>Settings</a></aside><main className="adminMain">
    <div className="eyebrow">Institution admin</div><h1>Community dashboard</h1>
    <div className="statCards"><div className="statCard"><strong>{all??0}</strong><span>Total records</span></div><div className="statCard"><strong>{claimed??0}</strong><span>Claimed</span></div><div className="statCard"><strong>{unclaimed??0}</strong><span>Unclaimed</span></div><div className="statCard"><strong>{requests??0}</strong><span>Verification requests</span></div></div>
    <AdminImport institutionId={id}/>
    <div className="adminGrid">
      <div className="card adminTableCard"><h3>Recent alumni records</h3><table className="table"><thead><tr><th>Name</th><th>Class</th><th>Status</th></tr></thead><tbody>{(recent||[]).map(r=><tr key={r.id}><td>{r.first_name} {r.last_name}</td><td>{r.grad_year||"—"}</td><td><span className={`status ${r.claimed_at?"claimed":"unclaimed"}`}>{r.claimed_at?"Claimed":"Unclaimed"}</span></td></tr>)}</tbody></table></div>
      <div className="card adminTableCard"><h3>Verification requests</h3>{!access?.length?<p className="muted">No requests yet.</p>:<table className="table"><thead><tr><th>Alumnus</th><th>Class</th><th>Status</th></tr></thead><tbody>{access.map(r=><tr key={r.id}><td>{r.first_name||r.email} {r.last_name||""}<small>{r.email}</small></td><td>{r.grad_year||"—"}</td><td><span className="status unclaimed">{r.status}</span></td></tr>)}</tbody></table>}</div>
    </div>
  </main></div></>;
}
