"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AuthActions() {
  const [signedIn, setSignedIn] = useState(false);
  const [ready, setReady] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setSignedIn(Boolean(data.user));
      setReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session?.user));
      setReady(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setSignedIn(false);
    router.push("/");
    router.refresh();
  }

  if (!ready) return <div className="navcta"><span className="navSkeleton" /></div>;

  if (signedIn) {
    return (
      <div className="navcta">
        <Link className="btn btnGhost" href="/me">My profile</Link>
        <button className="btn btnPrimary" type="button" onClick={signOut}>Sign out</button>
      </div>
    );
  }

  return (
    <div className="navcta">
      <Link className={`btn btnGhost ${pathname === "/login" ? "isActive" : ""}`} href="/login">Sign in</Link>
      <Link className="btn btnPrimary" href="/claim">Claim your profile</Link>
    </div>
  );
}
