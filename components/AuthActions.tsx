"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSchool } from "./SchoolProvider";

type State = {
  ready: boolean;
  signedIn: boolean;
  hasProfile: boolean;
  isAdmin: boolean;
};

export function AuthActions() {
  const [state, setState] = useState<State>({
    ready: false,
    signedIn: false,
    hasProfile: false,
    isAdmin: false,
  });
  const router = useRouter();
  const schoolId = useSchool().id;

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setState({ ready: true, signedIn: false, hasProfile: false, isAdmin: false });
        return;
      }

      // Only this school counts: a person can belong to several, each independent (DEC-13).
      const [{ data: profile }, { data: memberships }] = await Promise.all([
        supabase
          .from("alumni_profiles")
          .select("id")
          .eq("user_id", user.id)
          .eq("institution_id", schoolId)
          .maybeSingle(),
        supabase
          .from("institution_memberships")
          .select("role")
          .eq("user_id", user.id)
          .eq("institution_id", schoolId),
      ]);

      const roles = (memberships || []).map((m) => m.role);
      setState({
        ready: true,
        signedIn: true,
        hasProfile: Boolean(profile),
        isAdmin: roles.includes("school_admin") || roles.includes("reviewer"),
      });
    }

    load();
    const { data: listener } = supabase.auth.onAuthStateChange(() => load());
    return () => listener.subscription.unsubscribe();
  }, [schoolId]);

  async function signOut() {
    const supabase = createClient();
    // Ends this school's session only: other schools and devices stay signed in (DEC-13).
    await supabase.auth.signOut({ scope: "local" });
    setState({ ready: true, signedIn: false, hasProfile: false, isAdmin: false });
    router.push("/");
    router.refresh();
  }

  if (!state.ready)
    return (
      <div className="navcta">
        <span className="navSkeleton" />
      </div>
    );

  if (!state.signedIn) {
    return (
      <div className="navcta">
        <Link className="btn btnGhost" href="/login">
          Sign in
        </Link>
        <Link className="btn btnPrimary" href="/join">
          Join
        </Link>
      </div>
    );
  }

  return (
    <div className="navcta">
      {state.isAdmin && (
        <Link className="accountLink" href="/admin">
          Admin
        </Link>
      )}
      {state.hasProfile && (
        <Link className="btn btnGhost" href="/me">
          My profile
        </Link>
      )}
      <button className="btn btnPrimary" type="button" onClick={signOut}>
        Sign out
      </button>
    </div>
  );
}
