"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type State = {
  ready: boolean;
  signedIn: boolean;
  hasProfile: boolean;
  isAdmin: boolean;
};

export function AuthActions() {
  const [state, setState] = useState<State>({ ready:false, signedIn:false, hasProfile:false, isAdmin:false });
  const router = useRouter();

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setState({ ready:true, signedIn:false, hasProfile:false, isAdmin:false });
      return;
    }

    const [{ data: profile }, { data: memberships }] = await Promise.all([
      supabase.from("alumni_profiles").select("id").eq("user_id", user.id).maybeSingle(),
      supabase.from("institution_memberships").select("role").eq("user_id", user.id),
    ]);

    const roles = (memberships || []).map(m => m.role);
    setState({
      ready:true,
      signedIn:true,
      hasProfile:Boolean(profile),
      isAdmin:roles.includes("institution_admin") || roles.includes("super_admin"),
    });
  }

  useEffect(() => {
    const supabase = createClient();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- replaced by the server-side session in FND-09 (#95)
    load();
    const { data: listener } = supabase.auth.onAuthStateChange(() => load());
    return () => listener.subscription.unsubscribe();
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setState({ ready:true, signedIn:false, hasProfile:false, isAdmin:false });
    router.push("/");
    router.refresh();
  }

  if (!state.ready) return <div className="navcta"><span className="navSkeleton" /></div>;

  if (!state.signedIn) {
    return <div className="navcta">
      <Link className="btn btnGhost" href="/login">Sign in</Link>
      <Link className="btn btnPrimary" href="/claim">Claim your profile</Link>
    </div>;
  }

  return <div className="navcta">
    {state.isAdmin && <Link className="accountLink" href="/admin">Admin</Link>}
    <Link className="btn btnGhost" href={state.hasProfile ? "/me" : "/onboarding"}>
      {state.hasProfile ? "My profile" : "Complete profile"}
    </Link>
    <button className="btn btnPrimary" type="button" onClick={signOut}>Sign out</button>
  </div>;
}
