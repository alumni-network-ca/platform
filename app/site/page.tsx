import type { Metadata } from "next";
import Link from "next/link";

// The root domain (alumninetwork.ca): proxy.ts rewrites it here, and blocks /site on school addresses.
// Placeholder until the page for schools (PUB-02) is built. The console (SA-01) is at /console.
export const metadata: Metadata = {
  title: "Alumni Network",
  description: "Private professional networks for school alumni.",
};

export default function RootSitePage() {
  return (
    <main className="page">
      <div className="pageHeader">
        <div>
          <div className="eyebrow">Alumni Network</div>
          <h1>Private professional networks for school alumni</h1>
          <p className="muted">
            Each school has its own address, such as herzliah.alumninetwork.ca. Use the link your
            school sent you to sign in or join.
          </p>
          <p className="muted microcopy">
            <Link href="/console">Platform console</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
