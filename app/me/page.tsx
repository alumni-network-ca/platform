import Link from "next/link";
import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { dateLabel } from "@/lib/admin/data";
import { format, translations } from "@/lib/i18n";
import { CHANNELS, initials, type Channel, repeatsCurrentRole } from "@/lib/profile/fields";
import { loadMyProfile } from "@/lib/profile/server";
import { confirmStillAccurate } from "./actions";

// The alumnus's own profile (PRF-02; design Me): what other alumni see, each section with its edit page, and
// the visibility, contact, freshness and data controls beside it.

const join = (parts: (string | number | null | undefined)[], separator = " · ") =>
  parts.filter((part) => part !== null && part !== undefined && part !== "").join(separator);

type Role = {
  start_year: number | null;
  start_month: number | null;
  end_year: number | null;
  end_month: number | null;
  is_current: boolean;
};

/** "Mar 2019 – Jun 2023", "Mar 2019 – now", or a single date; a role saved without a month shows its year. */
function dates(role: Role, locale: string, now: string) {
  const label = (year: number | null, month: number | null) =>
    !year
      ? ""
      : month
        ? new Intl.DateTimeFormat(locale === "fr" ? "fr-CA" : "en-CA", {
            month: "short",
            year: "numeric",
            timeZone: "UTC",
          }).format(new Date(Date.UTC(year, month - 1, 1)))
        : String(year);
  const start = label(role.start_year, role.start_month);
  const end = role.is_current ? now : label(role.end_year, role.end_month);
  return start && end ? `${start} – ${end}` : start || end;
}

export default async function MyProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; confirmed?: string }>;
}) {
  const me = await loadMyProfile("/me");
  // Only once the shared check says incomplete; a failed read throws in loadMyProfile instead.
  if (!me.profile.onboarding_completed_at) redirect("/onboarding");
  const { saved, confirmed } = await searchParams;
  const { profile: p, t: o } = me;
  const t = translations[me.locale].me;
  const school = me.school.shortName;
  const name = `${p.preferred_name || p.first_name} ${p.last_name}`;
  const field = me.careerFields.find((f) => f.id === p.career_field_id)?.label;
  const offers = me.offerTypes.filter((offer) => me.offers.includes(offer.key));
  const channels = CHANNELS.flatMap((type) => {
    const channel = me.channels.get(type);
    return channel ? [{ type, public: channel.is_public }] : [];
  });
  const shared = channels.filter((c) => c.public);
  // The yearly check (DEC-06): the button shows from 30 days before it is due.
  // eslint-disable-next-line react-hooks/purity -- the page renders once per request
  const soon = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const due = p.confirmation_due_at ? Date.parse(p.confirmation_due_at) : null;
  const reach = (type: Channel, isPublic: boolean) =>
    format(
      !isPublic
        ? t.reachPrivate
        : type === "email" || type === "phone"
          ? t.reachButton
          : t.reachShown,
      { channel: o.channels[type] },
    );

  return (
    <>
      <Nav />
      <main className="me">
        <div className="meMain">
          {(saved || confirmed) && (
            <p className="notice noticeGood" role="status">
              {confirmed ? t.confirmed : t.saved}
            </p>
          )}
          <section className="meCard meHead">
            <span className="meAvatar" aria-hidden="true">
              {initials(p.preferred_name || p.first_name, p.last_name)}
            </span>
            <div className="meWho">
              <h1>
                {name} {me.maidenName && <span>({me.maidenName})</span>}
              </h1>
              {(p.job_title || p.employer) && <span>{join([p.job_title, p.employer])}</span>}
              <span className="meSub">
                {join([
                  format(o.classOf, { year: p.grad_year }),
                  join([p.city, p.country], ", "),
                  p.languages
                    .map((code) => o.languageNames[code as keyof typeof o.languageNames] ?? code)
                    .join(", "),
                ])}
              </span>
            </div>
            <Link className="onbBack" href="/me/edit/about">
              {t.edit}
            </Link>
          </section>

          <Section title={t.about} edit="/me/edit/about" t={t}>
            <p className="meText">{p.bio || <span className="meEmpty">{t.noBio}</span>}</p>
          </Section>

          <Section title={t.career} edit="/me/edit/career" t={t}>
            {p.job_title || p.employer || me.experience.length ? (
              <>
                {(p.job_title || p.employer) && (
                  <Row title={join([p.job_title, p.employer])} sub={join([field, p.city])} />
                )}
                {me.experience
                  .filter((role) => !repeatsCurrentRole(role, p))
                  .map((role, i) => (
                    <Row
                      key={i}
                      title={join([role.job_title, role.employer])}
                      sub={join([role.location, dates(role, me.locale, t.now)])}
                    />
                  ))}
              </>
            ) : (
              <p className="meEmpty">{t.noCareer}</p>
            )}
          </Section>

          <Section title={t.education} edit="/me/edit/education" t={t}>
            {me.education.map((row, i) => (
              <Row
                key={i}
                title={row.school}
                sub={join([row.degree, row.field_of_study, row.graduation_year])}
              />
            ))}
            {me.education.length === 0 && (
              <p className="meEmpty">{format(t.noEducation, { school })}</p>
            )}
            <Row title={me.school.name} sub={format(o.classOf, { year: p.grad_year })} />
          </Section>

          <Section title={t.openTo} edit="/me/edit/networking" t={t}>
            {offers.length ? (
              <div className="meTags">
                {offers.map((offer) => (
                  <span key={offer.key}>{offer.label}</span>
                ))}
              </div>
            ) : (
              <p className="meEmpty">{t.noOffers}</p>
            )}
          </Section>
        </div>

        <aside className="meSide">
          <section className="meCard meBox">
            <h2>{t.visibility}</h2>
            <span className="meState">
              <span
                className={p.visibility === "members" ? "meDot meDotOn" : "meDot"}
                aria-hidden="true"
              />
              {p.visibility === "members" ? format(t.visibleMembers, { school }) : t.visibleHidden}
            </span>
            <Link href="/me/visibility">{t.changeVisibility}</Link>
          </section>

          <section className="meCard meBox">
            <h2>{t.reach}</h2>
            {shared.length === 0 && <span>{t.reachNone}</span>}
            <ul className="meList">
              {channels.map((c) => (
                <li key={c.type}>{reach(c.type, c.public)}</li>
              ))}
            </ul>
            <Link href="/me/edit/contact">{t.editContact}</Link>
          </section>

          <section className="meCard meBox">
            <h2>{t.current}</h2>
            <span>
              {p.last_confirmed_at
                ? format(t.confirmedOn, { date: dateLabel(p.last_confirmed_at, me.locale) })
                : t.notConfirmed}
            </span>
            {due !== null && due <= soon && (
              <>
                <span className="meWarn">
                  {due <= soon - 30 * 24 * 60 * 60 * 1000
                    ? t.overdue
                    : format(t.dueOn, { date: dateLabel(p.confirmation_due_at, me.locale) })}
                </span>
                <form action={confirmStillAccurate}>
                  <button className="onbButton">{t.stillAccurate}</button>
                </form>
              </>
            )}
          </section>

          <section className="meCard meBox" id="your-data">
            <h2>{t.data}</h2>
            {/* A POST, so a link scanner or a prefetch never makes an export (each one is audited). */}
            <form method="post" action="/me/export">
              <button className="meLinkButton">{t.download}</button>
            </form>
            <Link href="/account/email">{t.signIn}</Link>
            <Link href="/me/delete" className="meDanger">
              {t.deleteAccount}
            </Link>
          </section>
        </aside>
      </main>
    </>
  );
}

function Section({
  title,
  edit,
  t,
  children,
}: {
  title: string;
  edit: string;
  t: (typeof translations)["en"]["me"] | (typeof translations)["fr"]["me"];
  children: React.ReactNode;
}) {
  return (
    <section className="meCard meSection" aria-label={title}>
      <div className="meSectionHead">
        <h2>{title}</h2>
        <Link href={edit}>
          {t.edit}
          <span className="srOnly"> — {title}</span>
        </Link>
      </div>
      {children}
    </section>
  );
}

function Row({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="meRow">
      <span>{title}</span>
      {sub && <span>{sub}</span>}
    </div>
  );
}
