import type { Metadata } from "next";
import Link from "next/link";
import { getServerTranslations } from "@/lib/i18n-server";
import { ContactForm } from "./ContactForm";
import { ContactLink } from "./ContactLink";
import styles from "./landing.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslations();
  return {
    title: `${t.nav.platformName} | ${t.schoolsLanding.label}`,
    description: t.schoolsLanding.intro,
  };
}

const icons = {
  arrow: "M4 12h15m-6-6 6 6-6 6",
  lock: "M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5z",
  shield: "M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Zm-3-10 2 2 4-4",
  search: "M21 21l-5-5m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z",
  school: "M3 21h18M5 21V9l7-6 7 6v12M9 21v-6h6v6M12 8v3",
  spark: "M12 2c0 6-4 10-10 10 6 0 10 4 10 10 0-6 4-10 10-10-6 0-10-4-10-10Z",
};

function Icon({ name }: { name: keyof typeof icons }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d={icons[name]} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// The illustration shows platform features without using real graduate records.
function PlatformPreview({
  copy,
}: {
  copy: Awaited<ReturnType<typeof getServerTranslations>>["t"]["schoolsLanding"]["preview"];
}) {
  return (
    <div className={styles.preview} aria-hidden="true">
      <div className={styles.previewCaption}>
        <span>{copy.label}</span>
        <Icon name="spark" />
      </div>
      <div className={styles.previewWindow}>
        <div className={styles.previewAddress}>
          <Icon name="lock" />
          <span>{copy.address}</span>
        </div>
        <div className={styles.previewBrand}>
          <div className={styles.featureIcon}>
            <Icon name="school" />
          </div>
          <div>
            <strong>{copy.school}</strong>
            <span>{copy.network}</span>
          </div>
        </div>
        <div className={styles.previewBody}>
          <strong>{copy.directory}</strong>
          <div className={styles.previewSearch}>
            <Icon name="search" />
            <span>{copy.search}</span>
          </div>
          <div className={styles.previewFilters}>
            <span>{copy.classYear}</span>
            <span>{copy.city}</span>
            <span>{copy.industry}</span>
          </div>
        </div>
      </div>
      <div className={styles.previewBadge}>
        <div className={styles.featureIcon}>
          <Icon name="shield" />
        </div>
        <div>
          <strong>{copy.verified}</strong>
          <span>{copy.approved}</span>
        </div>
      </div>
    </div>
  );
}

// The proxy serves this page on the bare platform domain and keeps school domains separate.
export default async function RootSitePage({
  searchParams,
}: {
  searchParams: Promise<{ inquiry?: string | string[] }>;
}) {
  const [{ locale, t }, query] = await Promise.all([getServerTranslations(), searchParams]);
  const copy = t.schoolsLanding;
  const inquiry = query.inquiry === "quote" ? "quote" : "demo";
  const features = [
    { icon: "school", ...copy.branding },
    { icon: "shield", ...copy.membership },
    { icon: "search", ...copy.directory },
  ] as const;
  const steps = [copy.setup, copy.invite, copy.review];

  return (
    <div className={styles.shell} lang={locale}>
      <main>
        <section className={`${styles.container} ${styles.hero}`} aria-labelledby="landing-title">
          <div>
            <p className={styles.kicker}>
              <span aria-hidden="true" />
              {copy.label}
            </p>
            <h1 id="landing-title">
              {copy.headline} <em>{copy.headlineAccent}</em>
            </h1>
            <p className={styles.lede}>{copy.intro}</p>
            <div className={styles.actions}>
              <ContactLink className={styles.primary} inquiry="demo">
                {copy.demo} <Icon name="arrow" />
              </ContactLink>
              <ContactLink className={styles.secondary} inquiry="quote">
                {copy.quote}
              </ContactLink>
            </div>
            <p className={styles.privacy}>
              <Icon name="lock" /> {copy.private}
            </p>
          </div>
          <PlatformPreview copy={copy.preview} />
        </section>

        <section
          className={styles.features}
          id="platform-features"
          aria-labelledby="landing-features"
        >
          <div className={styles.container}>
            <p className={styles.kicker}>
              <span aria-hidden="true" />
              {copy.featuresLabel}
            </p>
            <h2 id="landing-features">{copy.featuresTitle}</h2>
            <ul className={styles.featureList} role="list">
              {features.map(({ icon, title, body }) => (
                <li key={icon}>
                  <div className={styles.featureIcon}>
                    <Icon name={icon} />
                  </div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          className={`${styles.container} ${styles.process}`}
          id="how-it-works"
          aria-labelledby="landing-process"
        >
          <div>
            <p className={styles.kicker}>
              <span aria-hidden="true" />
              {copy.how}
            </p>
            <h2 id="landing-process">{copy.processTitle}</h2>
            <p className={styles.processBody}>{copy.processBody}</p>
          </div>
          <ol className={styles.steps} role="list">
            {steps.map(({ title, body }, index) => (
              <li key={title}>
                <span className={styles.stepNumber} aria-hidden="true">
                  0{index + 1}
                </span>
                <div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section
          className={styles.invite}
          id="contact"
          aria-labelledby="landing-invite"
          tabIndex={-1}
        >
          <div className={styles.container}>
            <div className={styles.inviteIcon}>
              <Icon name="school" />
            </div>
            <h2 id="landing-invite">{copy.inviteTitle}</h2>
            <p>{copy.inviteBody}</p>
            <ContactForm
              key={inquiry}
              copy={{ demo: copy.demo, quote: copy.quote, contact: copy.contact }}
              inquiry={inquiry}
            />
          </div>
        </section>
      </main>
      <footer className={styles.footer}>
        <div className={styles.container}>
          <strong>{t.nav.platformName}</strong>
          <Link href="/console">{t.nav.platformTagline}</Link>
        </div>
      </footer>
    </div>
  );
}
