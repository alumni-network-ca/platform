import {redirect} from "next/navigation";
import Link from "next/link";
import {Nav} from "@/components/Nav";
import {ProfileEditor} from "@/components/ProfileEditor";
import {createClient} from "@/lib/supabase/server";

export default async function MyProfilePage(){
 const supabase=await createClient();const{data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login?next=/me");
 const{data:p}=await supabase.from("alumni_profiles").select("*,availability_flags(*)").eq("user_id",user.id).maybeSingle();
 if(!p)redirect("/onboarding");if(!p.onboarding_completed_at)redirect("/onboarding");
 const[{data:experience},{data:education}]=await Promise.all([
   supabase.from("alumni_experience").select("*").eq("profile_id",p.id).order("sort_order"),
   supabase.from("alumni_education").select("*").eq("profile_id",p.id).order("sort_order")
 ]);
 const raw=Array.isArray(p.availability_flags)?p.availability_flags[0]:p.availability_flags;
 return <><Nav/><main className="page"><div className="myProfileHeader"><div><div className="eyebrow">Member settings</div><h1>Manage my profile</h1><p className="muted">Update everything you entered during onboarding, including your career field, work history, education, network preferences and privacy.</p></div><Link className="btn btnLight" href={`/profile/${p.id}`}>View public profile →</Link></div><ProfileEditor profile={p} flags={raw||{}} experience={experience||[]} education={education||[]}/></main></>;
}
