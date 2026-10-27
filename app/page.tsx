import Link from "next/link";
import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { getAccount } from "@/lib/auth/account";
import { homeFor } from "@/lib/auth/home";
import { schoolBranding } from "@/lib/school";

const recent: [year: string, name: string, role: string, offer: string][] = [
  ["'08", "Dana Kessler", "Corporate Lawyer · Montreal", "Mentoring"],
  ["'14", "Aaron Segal", "Product Lead · New York", "Open to intros"],
  ["'99", "Rachel Berger", "Family Physician · Toronto", "Career advice"],
];

export default async function Home() {
  const { school, user, state } = await getAccount();
  // Signed-in visitors go straight to their home page at this school (ADR 0014).
  if (user) redirect(homeFor(state));
  const { shortName, networkName } = schoolBranding(school);
  return (
    <>
      <Nav />
      <main>
        <section className="hero">
          <div>
            <div className="eyebrow">✦ Private network · Verified graduates only</div>
            <h1>
              Every class,
              <br />
              <em>one</em> professional home.
            </h1>
            <p className="lede">
              Find {shortName} graduates by career, city and expertise — then connect for
              mentorship, advice, internships, introductions and opportunities.
            </p>
            <div className="ctas">
              <Link className="btn btnPrimary" href="/join">
                Join the network
              </Link>
              <Link className="btn btnLight" href="/directory">
                Explore the directory →
              </Link>
            </div>
            <div className="microcopy">
              Alumni control their own information. The school approves every member before they can
              see the directory.
            </div>
          </div>
          <div className="ledgerCard">
            <div className="ledgerHead">
              <strong>Recently joined</strong>
              <span className="muted">{shortName} network</span>
            </div>
            {recent.map(([year, name, role, flag]) => (
              <div className="ledgerRow" key={name}>
                <div className="year">{year}</div>
                <div className="avatar avatarInitials">
                  {name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div style={{ flex: 1 }}>
                  <strong>{name}</strong>
                  <div className="personMeta">{role}</div>
                </div>
                <div className="pill">{flag}</div>
              </div>
            ))}
          </div>
        </section>
        <section className="stats">
          <div className="statsInner">
            <div>
              <div className="statNum">50</div>
              <div className="statLbl">Demo alumni ready to explore</div>
            </div>
            <div>
              <div className="statNum">5+</div>
              <div className="statLbl">Professional sectors</div>
            </div>
            <div>
              <div className="statNum">8+</div>
              <div className="statLbl">Cities represented</div>
            </div>
            <div>
              <div className="statNum">1</div>
              <div className="statLbl">Connected {shortName} community</div>
            </div>
          </div>
        </section>
        <section className="section">
          <div className="eyebrow">✦ Built for useful connections</div>
          <h2>More than an alumni list.</h2>
          <div className="grid3">
            <div className="card">
              <h3>Search with intent</h3>
              <p className="muted">
                Find physicians open to shadowing, lawyers willing to mentor, founders open to
                introductions, or alumni hiring interns.
              </p>
            </div>
            <div className="card">
              <h3>Alumni stay in control</h3>
              <p className="muted">
                Profiles, contact preferences and visibility are managed by the alumnus, while
                {shortName} manages membership and verification.
              </p>
            </div>
            <div className="card">
              <h3>Built to stay current</h3>
              <p className="muted">
                Profile freshness and reconfirmation are part of the platform so the network does
                not become a stale directory.
              </p>
            </div>
          </div>
        </section>
        <footer className="footer">
          <div>
            <strong>{networkName}</strong>
            <span>Private community for verified graduates.</span>
          </div>
          <div>
            <Link href="/">Home</Link>
            <Link href="/directory">Directory</Link>
            <Link href="/login">Sign in</Link>
          </div>
        </footer>
      </main>
    </>
  );
}
