import Link from "next/link";
import { Nav } from "@/components/Nav";
import { AVATAR_TINTS } from "@/config/ui";
import { requireAccess } from "@/lib/auth/account";
import {
  classmateCount,
  confirmationDue,
  displayName,
  latestContacts,
  others,
} from "@/lib/home/people";
import { format } from "@/lib/i18n";
import { getServerTranslations } from "@/lib/i18n-server";
import { initials, optionsFor } from "@/lib/profile/fields";
import { schoolBranding } from "@/lib/school";
import { schoolConfig } from "@/lib/tenant/config";
import { confirmStillAccurate } from "./actions";
import { Button } from "@/components/ui/button";
import { ForwardArrow } from "@/components/icons";

// The alumni home page (DIR-06; design Home): the reader's own status first, then ways into the network. Every
// read goes through RLS: search_directory returns only members-visible profiles, and contact_events only the
// reader's own contacts (a person never learns who contacted them).

async function read<T>(query: PromiseLike<{ data: T; error: { message: string } | null }>) {
  const { data, error } = await query;
  if (error) throw new Error(`Could not load the home page: ${error.message}`);
  return data;
}

const tint = (id: string) => AVATAR_TINTS[parseInt(id.slice(-2), 16) % AVATAR_TINTS.length];

type Card = {
  id: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  grad_year: number;
  city: string | null;
  job_title: string | null;
  employer: string | null;
};

const roleLine = (p: { job_title: string | null; employer: string | null }) =>
  [p.job_title, p.employer].filter(Boolean).join(" · ");

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ confirm?: string }>;
}) {
  const { school, supabase, user } = await requireAccess("/home");
  const [{ confirm }, { locale, t: all }, me] = await Promise.all([
    searchParams,
    getServerTranslations(),
    read(
      supabase
        .from("alumni_profiles")
        .select(
          "id, first_name, last_name, preferred_name, grad_year, job_title, employer, visibility, last_confirmed_at, confirmation_due_at",
        )
        .eq("institution_id", school.id)
        .eq("user_id", user.id)
        .eq("status", "active")
        .single(),
    ),
  ]);
  if (!me) throw new Error("Could not load the home page: no active profile");
  const t = all.home;
  const { shortName, networkName } = schoolBranding(school);
  const listed = me.visibility === "members";

  const [classmates, newcomers, config, events, office] = await Promise.all([
    read(
      supabase.rpc("search_directory", {
        p_inst: school.id,
        p_filters: { grad_year: me.grad_year },
        p_limit: 4,
        p_sort: "random",
      }),
    ),
    read(supabase.rpc("search_directory", { p_inst: school.id, p_limit: 4, p_sort: "recent" })),
    schoolConfig(school.id),
    read(
      supabase
        .from("contact_events")
        .select("recipient_profile_id, channel, created_at")
        .eq("institution_id", school.id)
        .eq("initiator_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
    ),
    read(supabase.from("institutions").select("reply_to_email").eq("id", school.id).maybeSingle()),
  ]);

  const contacts = latestContacts(events ?? []);
  // Only people still in the directory come back, so someone who has since hidden their profile drops out.
  const people = contacts.length
    ? await read(
        supabase
          .from("alumni_profiles")
          .select("id, first_name, last_name, preferred_name")
          .in(
            "id",
            contacts.map((c) => c.recipient_profile_id),
          ),
      )
    : [];
  const byId = new Map((people ?? []).map((p) => [p.id, p]));
  const contacted = contacts.flatMap((c) => {
    const person = byId.get(c.recipient_profile_id);
    return person ? [{ ...c, person }] : [];
  });

  const classTotal = classmateCount(Number(classmates?.[0]?.total_count ?? 0), listed);
  const classCards = others(classmates ?? [], me.id);
  const newCards = others(newcomers ?? [], me.id);
  const offers = optionsFor(config.offer_types, school.id);
  const dateFormat = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale === "fr" ? "fr-CA" : "en-CA", {
      timeZone: "America/Toronto",
      ...options,
    });
  const monthYear = dateFormat({ month: "short", year: "numeric" });
  const shortDate = dateFormat({ month: "short", day: "numeric" });
  const longDate = dateFormat({ dateStyle: "medium" });
  const askToConfirm = confirm !== "done" && confirmationDue(me.confirmation_due_at, new Date());
  const name = me.preferred_name || me.first_name;
  const replyTo = office?.reply_to_email;

  const avatar = (p: { id: string; first_name: string; last_name: string }, small = false) => (
    <span
      aria-hidden="true"
      className={small ? "homeAvatar homeAvatarSmall" : "homeAvatar"}
      style={{ background: tint(p.id) }}
    >
      {initials(p.first_name, p.last_name)}
    </span>
  );
  const card = (p: Card, meta: string, extra?: string) => (
    <Link key={p.id} className="homeCard" href={`/profile/${p.id}`}>
      <span className="homeCardHead">
        {avatar(p)}
        <span className="homeCardName">
          <strong>{displayName(p)}</strong>
          <small>{meta}</small>
        </span>
      </span>
      {roleLine(p) && <span className="homeCardRole">{roleLine(p)}</span>}
      {extra && <span className="homeTag">{extra}</span>}
    </Link>
  );

  return (
    <>
      <Nav />
      <main className="homePage">
        <div className="homeHead">
          <span className="eyebrow">
            {format(t.eyebrow, { year: me.grad_year, network: networkName })}
          </span>
          <h1>{format(t.welcome, { name })}</h1>
        </div>

        {askToConfirm && (
          <section className="homeBanner homeBannerWarn" aria-label={t.freshnessLabel}>
            <div>
              <strong>{t.freshnessTitle}</strong>
              <p>
                {me.last_confirmed_at &&
                  `${format(t.lastConfirmed, { date: longDate.format(new Date(me.last_confirmed_at)) })} `}
                {t.freshnessBody}
              </p>
              {confirm === "failed" && (
                <p role="alert" className="homeBannerError">
                  {t.confirmFailed}
                </p>
              )}
            </div>
            <div className="homeActions">
              <form action={confirmStillAccurate}>
                <Button type="submit">{t.stillAccurate}</Button>
              </form>
              <Button asChild variant="secondary">
                <Link href="/me">{t.updateProfile}</Link>
              </Button>
            </div>
          </section>
        )}
        {confirm === "done" && (
          <p className="homeBanner homeBannerGood" role="status">
            {t.confirmed}
          </p>
        )}

        <div className="homeColumns">
          <div className="homeMain">
            <section className="homePanel">
              <h2>{t.findTitle}</h2>
              <form action="/directory" className="homeSearch" role="search">
                <label htmlFor="home-q" className="srOnly">
                  {t.searchLabel}
                </label>
                <input id="home-q" name="q" type="search" placeholder={t.searchPlaceholder} />
                <Button type="submit">{t.search}</Button>
              </form>
              {offers.length > 0 && (
                <div className="homeOffers">
                  <span>{t.openTo}</span>
                  <ul>
                    {offers.map((o) => (
                      <li key={o.key}>
                        <Link href={`/directory?offer=${encodeURIComponent(o.key)}`}>
                          {locale === "fr" ? o.label_fr : o.label_en}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            <section className="homeSection" aria-labelledby="home-class">
              <div className="homeSectionHead">
                <div>
                  <h2 id="home-class">{format(t.classTitle, { year: me.grad_year })}</h2>
                  <p>{t.classSubtitle}</p>
                </div>
                {classTotal > 0 && (
                  <Link href={`/directory?grad_year=${me.grad_year}`}>
                    {classTotal === 1 ? t.seeClassOne : format(t.seeClass, { count: classTotal })}
                    <ForwardArrow />
                  </Link>
                )}
              </div>
              {classCards.length ? (
                <div className="homeGrid">
                  {classCards.map((p) =>
                    card(p, p.city ?? format(t.classOf, { year: p.grad_year })),
                  )}
                </div>
              ) : (
                <p className="homeEmpty">{t.classEmpty}</p>
              )}
            </section>

            <section className="homeSection" aria-labelledby="home-new">
              <div className="homeSectionHead">
                <h2 id="home-new">{t.newTitle}</h2>
                <Link href="/directory">
                  {t.browse}
                  <ForwardArrow />
                </Link>
              </div>
              {newCards.length ? (
                <div className="homeGrid">
                  {newCards.map((p) =>
                    card(
                      p,
                      [format(t.classOf, { year: p.grad_year }), p.city]
                        .filter(Boolean)
                        .join(" · "),
                      p.published_at
                        ? format(t.joined, { date: monthYear.format(new Date(p.published_at)) })
                        : undefined,
                    ),
                  )}
                </div>
              ) : (
                <p className="homeEmpty">{t.newEmpty}</p>
              )}
            </section>
          </div>

          <aside className="homeSide">
            <section className="homePanel">
              <div className="homeCardHead">
                {avatar(me)}
                <span className="homeCardName">
                  <h2>{t.profileTitle}</h2>
                  {roleLine(me) && <small>{roleLine(me)}</small>}
                </span>
              </div>
              <p className="homeVisibility">
                <span aria-hidden="true" className={listed ? "homeDot homeDotOn" : "homeDot"} />
                {listed ? format(t.visible, { school: shortName }) : t.hidden}
              </p>
              <Link href="/me">{t.viewProfile}</Link>
              <Link href="/me#visibility">{t.changeVisibility}</Link>
            </section>

            <section className="homePanel">
              <h2>{t.contactedTitle}</h2>
              {contacted.length > 0 && (
                <ul className="homeContacts">
                  {contacted.map((c) => (
                    <li key={c.recipient_profile_id}>
                      <Link href={`/profile/${c.person.id}`}>
                        {avatar(c.person, true)}
                        <span>
                          <strong>{displayName(c.person)}</strong>
                          <small>
                            {all.onboarding.channels[
                              c.channel as keyof typeof all.onboarding.channels
                            ] ?? c.channel}{" "}
                            · {shortDate.format(new Date(c.created_at))}
                          </small>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <p className="homeNote">{t.contactedNote}</p>
            </section>

            <section className="homePanel">
              <h2>{t.privacyTitle}</h2>
              <p>{format(t.privacyBody, { school: shortName })}</p>
              {replyTo && <a href={`mailto:${replyTo}`}>{t.contactOffice}</a>}
            </section>
          </aside>
        </div>
      </main>
    </>
  );
}
