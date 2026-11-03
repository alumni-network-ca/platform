import Link from "next/link";
import { notFound } from "next/navigation";
import { ContactReveal } from "@/components/directory/ContactReveal";
import { Nav } from "@/components/Nav";
import { requireAccess } from "@/lib/auth/account";
import { format, translations } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n-server";
import { initials, optionsFor, repeatsCurrentRole } from "@/lib/profile/fields";
import { schoolBranding } from "@/lib/school";
import { schoolConfig } from "@/lib/tenant/config";

// An alumnus's profile as other alumni see it (DIR-03, CON-02; design Profile). Only a published profile at this
// school opens: anything else is a 404, even for staff whose RLS could read hidden records. Email and phone are
// never in the page: they come one at a time through initiate_contact. The design's relayed message form is a
// future module (ADR 0006, FUT-11), so contact works by reveal as decided in DEC-03.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LINKS = ["linkedin", "facebook", "instagram", "website"] as const;

async function read<T>(query: PromiseLike<{ data: T; error: { message: string } | null }>) {
  const { data, error } = await query;
  if (error) throw new Error(`Could not load the profile: ${error.message}`);
  return data;
}

type Role = {
  job_title: string;
  employer: string | null;
  location: string | null;
  start_year: number | null;
  start_month: number | null;
  end_year: number | null;
  end_month: number | null;
  is_current: boolean;
};

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { school, supabase, user } = await requireAccess(`/profile/${id}`);
  if (!UUID.test(id)) notFound();
  const locale = await getServerLocale();
  const t = translations[locale].profile;
  const o = translations[locale].onboarding;
  const p = await read(
    supabase
      .from("alumni_profiles")
      .select(
        "id, user_id, first_name, last_name, preferred_name, grad_year, city, country, bio, job_title, employer, career_field_id, languages, last_confirmed_at",
      )
      .eq("id", id)
      .eq("institution_id", school.id)
      .eq("status", "active")
      .eq("visibility", "members")
      .maybeSingle(),
  );
  if (!p) notFound();

  const [education, experience, offerIds, links, contactTypes, config] = await Promise.all([
    read(
      supabase
        .from("alumni_education")
        .select("school, degree, field_of_study, graduation_year")
        .eq("profile_id", id)
        .order("sort_order"),
    ),
    read(
      supabase
        .from("alumni_experience")
        .select(
          "job_title, employer, location, start_year, start_month, end_year, end_month, is_current",
        )
        .eq("profile_id", id)
        .order("sort_order"),
    ),
    read(supabase.from("profile_offers").select("offer_type_id").eq("profile_id", id)),
    // Public links only, whoever reads: staff RLS could return the private channels too.
    read(
      supabase
        .from("profile_contact_channels")
        .select("type, value")
        .eq("profile_id", id)
        .eq("is_public", true)
        .in("type", [...LINKS])
        .order("sort_order"),
    ),
    read(supabase.rpc("profile_contact_types", { p_profile: id })),
    schoolConfig(school.id),
  ]);

  const label = (row: { label_en: string; label_fr: string }) =>
    locale === "fr" ? row.label_fr : row.label_en;
  const name = `${p.preferred_name || p.first_name} ${p.last_name}`;
  const first = p.preferred_name || p.first_name;
  const own = p.user_id === user.id;
  const field = config.career_fields.find((f) => f.id === p.career_field_id);
  const offerKeys = new Set(
    config.offer_types
      .filter((r) => (offerIds ?? []).some((x) => x.offer_type_id === r.id))
      .map((r) => r.key),
  );
  const offers = optionsFor(config.offer_types, school.id).filter((offer) =>
    offerKeys.has(offer.key),
  );
  const reveal = (contactTypes ?? []).filter((type) => type === "email" || type === "phone");
  const shared = links ?? [];
  const date = (year: number, month: number | null) =>
    month
      ? new Intl.DateTimeFormat(locale === "fr" ? "fr-CA" : "en-CA", {
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        }).format(new Date(Date.UTC(year, month - 1, 1)))
      : String(year);
  const dates = (role: Role) => {
    const start = role.start_year ? date(role.start_year, role.start_month) : "";
    const end = role.is_current ? t.now : role.end_year ? date(role.end_year, role.end_month) : "";
    return start && end ? `${start} – ${end}` : start || end;
  };
  const join = (parts: (string | number | null | undefined)[], separator = " · ") =>
    parts.filter((part) => part !== null && part !== undefined && part !== "").join(separator);

  return (
    <>
      <Nav />
      <main className="me profPage">
        <Link className="meBackLink profBack" href="/directory">
          ← {t.back}
        </Link>
        <div className="meMain">
          {own && (
            <p className="notice noticeGood">
              {t.yours} <Link href="/me">{t.editMine}</Link>
            </p>
          )}
          <section className="meCard profHead">
            <div className="profBanner" aria-hidden="true" />
            <div className="profHeadBody">
              <span className="meAvatar profAvatar" aria-hidden="true">
                {initials(p.preferred_name || p.first_name, p.last_name)}
              </span>
              <div className="meWho">
                <h1>{name}</h1>
                {(p.job_title || p.employer) && <span>{join([p.job_title, p.employer])}</span>}
                <span className="meSub">
                  {join([
                    format(t.classOf, { year: p.grad_year }),
                    join([p.city, p.country], ", "),
                    p.languages
                      .map((code) => o.languageNames[code as keyof typeof o.languageNames] ?? code)
                      .join(", "),
                  ])}
                </span>
              </div>
              {offers.length > 0 && (
                <div className="meTags">
                  {offers.map((offer) => (
                    <span key={offer.key}>{label(offer)}</span>
                  ))}
                </div>
              )}
            </div>
          </section>

          {p.bio && (
            <section className="meCard meSection" aria-label={t.about}>
              <h2 className="profH2">{t.about}</h2>
              <p className="meText">{p.bio}</p>
            </section>
          )}

          {(p.job_title || p.employer || (experience ?? []).length > 0) && (
            <section className="meCard meSection" aria-label={t.workHistory}>
              <h2 className="profH2">{t.workHistory}</h2>
              {(p.job_title || p.employer) && (
                <Row
                  title={join([p.job_title, p.employer])}
                  sub={join([field && label(field), p.city])}
                />
              )}
              {(experience ?? [])
                .filter((role) => !repeatsCurrentRole(role, p))
                .map((role, i) => (
                  <Row
                    key={i}
                    title={join([role.job_title, role.employer])}
                    sub={join([role.location, dates(role)])}
                  />
                ))}
            </section>
          )}

          <section className="meCard meSection" aria-label={t.education}>
            <h2 className="profH2">{t.education}</h2>
            {(education ?? []).map((row, i) => (
              <Row
                key={i}
                title={row.school}
                sub={join([row.degree, row.field_of_study, row.graduation_year])}
              />
            ))}
            <Row title={school.name} sub={format(t.classOf, { year: p.grad_year })} />
          </section>
        </div>

        <aside className="meSide">
          <section className="meCard meBox" aria-labelledby="contact-title">
            <h2 id="contact-title">{format(t.contactTitle, { name: first })}</h2>
            {reveal.length === 0 && shared.length === 0 ? (
              <span>{t.noContact}</span>
            ) : (
              <>
                <p className="profNote">
                  {format(t.contactNote, { school: schoolBranding(school).shortName })}
                </p>
                {reveal.map((type) => (
                  <ContactReveal
                    key={type}
                    profileId={p.id}
                    channel={type as "email" | "phone"}
                    label={type === "email" ? t.showEmail : t.showPhone}
                    copyLabel={t.copy}
                    copiedLabel={t.copied}
                    failedLabel={t.revealFailed}
                  />
                ))}
                {shared.map((link) => (
                  <a key={link.type} href={link.value} target="_blank" rel="noopener noreferrer">
                    {o.channels[link.type as (typeof LINKS)[number]]}
                    <span className="srOnly"> {t.opensNewTab}</span>
                  </a>
                ))}
              </>
            )}
          </section>
          {p.last_confirmed_at && (
            <section className="meCard meBox">
              <span>
                {format(t.confirmed, {
                  date: new Intl.DateTimeFormat(locale === "fr" ? "fr-CA" : "en-CA", {
                    month: "long",
                    year: "numeric",
                    timeZone: "America/Toronto",
                  }).format(new Date(p.last_confirmed_at)),
                })}
              </span>
            </section>
          )}
        </aside>
      </main>
    </>
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
