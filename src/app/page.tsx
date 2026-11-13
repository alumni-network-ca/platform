import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccount } from "@/lib/auth/account";
import { homeFor } from "@/lib/auth/home";
import { getServerLocale } from "@/lib/i18n-server";
import { schoolBranding } from "@/lib/school";
import { Button } from "@/components/ui/button";
import { ArrowRight, UserRound } from "lucide-react";

// This page is public, so it never carries alumni names: only approved members see them.
const recent: [year: string, role: string, offer: string][] = [
  ["'08", "Corporate Lawyer · Montreal", "Mentoring"],
  ["'14", "Product Lead · New York", "Open to intros"],
  ["'99", "Family Physician · Toronto", "Career advice"],
];

const wrap = "mx-auto max-w-[1180px] px-12 max-[850px]:px-5";
const eyebrow = "mb-4.5 text-[11px] font-extrabold tracking-[0.14em] text-primary uppercase";
const serif = "font-[Georgia,'Times_New_Roman',serif] font-medium tracking-[-0.018em]";
const stat = "border-r border-white/12 last:border-r-0";
const statValue = "font-mono text-[29px] tabular-nums";
const statLabel = "mt-1 text-sm text-on-brand-faint";
const card = "rounded-lg border bg-card p-6.5";
const cardTitle = "mb-2 text-lg font-bold";
const cardBody = "leading-[1.65] text-muted-foreground";
const footerLink = "text-sm text-on-deep-soft hover:text-white hover:underline";

export default async function Home() {
  const { school, user, state } = await getAccount();
  // Signed-in visitors go straight to their home page at this school (ADR 0014).
  if (user) redirect(homeFor(state));
  const { shortName, networkName } = schoolBranding(school);
  const fr = (await getServerLocale()) === "fr";
  return (
    <main>
      <section
        className={`${wrap} grid grid-cols-[1.07fr_0.93fr] items-center gap-16 pt-[86px] pb-[66px] max-[850px]:grid-cols-1 max-[850px]:py-14`}
      >
        <div>
          <div className={eyebrow}>Private network · Verified graduates only</div>
          <h1 className={`${serif} mb-5.5 text-[54px] leading-[1.06] max-[850px]:text-[40px]`}>
            Every class,
            <br />
            <em className="text-primary">one</em> professional home.
          </h1>
          <p className="max-w-[540px] text-lg leading-[1.66] text-subtle-foreground">
            Find {shortName} graduates by career, city and expertise — then connect for mentorship,
            advice, internships, introductions and opportunities.
          </p>
          <div className="my-7.5 flex gap-3 max-[600px]:flex-col max-[600px]:items-stretch">
            <Button asChild>
              <Link href="/join">Join the network</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/directory">
                Explore the directory
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          </div>
          <p className="text-sm leading-normal text-muted-foreground">
            Alumni control their own information. The school approves every member before they can
            see the directory.
          </p>
        </div>
        <div className="rounded-lg border bg-card p-2 shadow-(--shadow)">
          <div className="flex items-center justify-between gap-3.5 border-b px-4 py-3.5">
            <strong>Recently joined</strong>
            <span className="text-muted-foreground">{shortName} network</span>
          </div>
          {recent.map(([year, role, flag]) => (
            <div
              className="flex items-center gap-3.5 border-b px-4 py-3.5 last:border-b-0"
              key={role}
            >
              <div className="rounded-sm bg-primary-tint px-2 py-1.5 font-mono text-primary">
                {year}
              </div>
              <div
                className="grid size-[42px] shrink-0 place-items-center rounded-full bg-linear-135 from-subtle-foreground to-brand text-white"
                aria-hidden="true"
              >
                <UserRound className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                {/* A blurred placeholder, not a real name, so nothing leaks via page source. */}
                <strong>
                  <span
                    className="pointer-events-none inline-block blur-[6px] select-none"
                    aria-hidden="true"
                  >
                    {fr ? "Nom du membre" : "Member name"}
                  </span>
                  <span className="sr-only">Name visible to members</span>
                </strong>
                <div className="text-sm text-muted-foreground">{role}</div>
              </div>
              <div className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-bold whitespace-nowrap text-primary">
                {flag}
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="bg-brand text-brand-foreground">
        <div
          className={`${wrap} grid grid-cols-4 gap-6 py-8.5 max-[850px]:grid-cols-2 max-[850px]:py-7`}
        >
          <div className={stat}>
            <div className={statValue}>50</div>
            <div className={statLabel}>Demo alumni ready to explore</div>
          </div>
          <div className={stat}>
            <div className={statValue}>5+</div>
            <div className={statLabel}>Professional sectors</div>
          </div>
          <div className={stat}>
            <div className={statValue}>8+</div>
            <div className={statLabel}>Cities represented</div>
          </div>
          <div className={stat}>
            <div className={statValue}>1</div>
            <div className={statLabel}>Connected {shortName} community</div>
          </div>
        </div>
      </section>
      <section className={`${wrap} py-18`}>
        <div className={eyebrow}>Built for useful connections</div>
        <h2 className={`${serif} mb-8 text-[34px] leading-tight`}>More than an alumni list.</h2>
        <div className="grid grid-cols-3 gap-5.5 max-[850px]:grid-cols-2 max-[600px]:grid-cols-1">
          <div className={card}>
            <h3 className={cardTitle}>Search with intent</h3>
            <p className={cardBody}>
              Find physicians open to shadowing, lawyers willing to mentor, founders open to
              introductions, or alumni hiring interns.
            </p>
          </div>
          <div className={card}>
            <h3 className={cardTitle}>Alumni stay in control</h3>
            <p className={cardBody}>
              Profiles, contact preferences and visibility are managed by the alumnus, while{" "}
              {shortName} manages membership and verification.
            </p>
          </div>
          <div className={card}>
            <h3 className={cardTitle}>Built to stay current</h3>
            <p className={cardBody}>
              Profile freshness and reconfirmation are part of the platform so the network does not
              become a stale directory.
            </p>
          </div>
        </div>
      </section>
      <footer className="flex items-center justify-between gap-5 bg-brand-deep px-12 py-7.5 text-white max-[850px]:items-start max-[850px]:px-5 max-[850px]:py-7 max-[600px]:flex-col max-[600px]:items-stretch">
        <div className="flex items-center gap-5.5 max-[600px]:flex-col max-[600px]:items-stretch max-[600px]:gap-2.5">
          <strong>{networkName}</strong>
          <span className="text-xs text-on-deep-muted">
            Private community for verified graduates.
          </span>
        </div>
        <div className="flex items-center gap-5.5 max-[600px]:flex-col max-[600px]:items-stretch max-[600px]:gap-2.5">
          <Link className={footerLink} href="/">
            Home
          </Link>
          <Link className={footerLink} href="/directory">
            Directory
          </Link>
          <Link className={footerLink} href="/login">
            Sign in
          </Link>
        </div>
      </footer>
    </main>
  );
}
