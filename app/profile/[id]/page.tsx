import Link from "next/link";
import { ContactReveal } from "@/components/directory/ContactReveal";
import { publishedProfile } from "@/lib/directory/profile";
import { format, translations } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n-server";
import { initials, optionsFor, repeatsCurrentRole } from "@/lib/profile/fields";
import { schoolBranding } from "@/lib/school";
import { schoolConfig } from "@/lib/tenant/config";
import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";
import {
  Avatar,
  Tags,
  frame,
  mainColumn,
  notice,
  panel,
  sideColumn,
  textLink,
} from "@/components/alumni/parts";
import {
  ProfileRow,
  ProfileWho,
  SectionHead,
  bodyText,
  profileSection,
  sideBox,
  sideBoxTitle,
} from "@/components/alumni/profile";
import { BackArrow } from "@/components/icons";

// An alumnus's profile as other alumni see it (DIR-03, CON-02; design Profile). Only a published profile at this
// school opens, checked in lib/directory/profile.ts. Email and phone are never in the page: they come one at a time
// through initiate_contact. The design's relayed message form is a future module (ADR 0006, FUT-11), so contact works
// by reveal as decided in DEC-03.

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
  const { school, supabase, user, profile: p } = await publishedProfile(id);
  const locale = await getServerLocale();
  const t = translations[locale].profile;
  const o = translations[locale].onboarding;

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
    <main className={frame.split}>
      <div className="basis-full">
        <Link className={cn(textLink, "text-base")} href="/directory">
          <BackArrow />
          {t.back}
        </Link>
      </div>
      <div className={mainColumn}>
        {own && (
          <p className={notice({ tone: "good" })}>
            {t.yours}{" "}
            <Link className="underline underline-offset-2 hover:no-underline" href="/me">
              {t.editMine}
            </Link>
          </p>
        )}
        <section className={cn(panel, "overflow-hidden")}>
          <div className="h-[88px] bg-brand" aria-hidden="true" />
          <div className="flex flex-col gap-3.5 px-7 pb-6.5 max-[720px]:px-5">
            <Avatar
              initials={initials(p.preferred_name || p.first_name, p.last_name)}
              size="xl"
              className="-mt-11 size-[88px] border-4 border-card"
            />
            <ProfileWho
              name={name}
              role={join([p.job_title, p.employer])}
              details={join([
                format(t.classOf, { year: p.grad_year }),
                join([p.city, p.country], ", "),
                p.languages
                  .map((code) => o.languageNames[code as keyof typeof o.languageNames] ?? code)
                  .join(", "),
              ])}
            />
            {offers.length > 0 && <Tags size="md" labels={offers.map(label)} />}
          </div>
        </section>

        {p.bio && (
          <section className={profileSection} aria-label={t.about}>
            <SectionHead title={t.about} />
            <p className={bodyText}>{p.bio}</p>
          </section>
        )}

        {(p.job_title || p.employer || (experience ?? []).length > 0) && (
          <section className={profileSection} aria-label={t.workHistory}>
            <SectionHead title={t.workHistory} />
            {(p.job_title || p.employer) && (
              <ProfileRow
                title={join([p.job_title, p.employer])}
                sub={join([field && label(field), p.city])}
              />
            )}
            {(experience ?? [])
              .filter((role) => !repeatsCurrentRole(role, p))
              .map((role, i) => (
                <ProfileRow
                  key={i}
                  title={join([role.job_title, role.employer])}
                  sub={join([role.location, dates(role)])}
                />
              ))}
          </section>
        )}

        <section className={profileSection} aria-label={t.education}>
          <SectionHead title={t.education} />
          {(education ?? []).map((row, i) => (
            <ProfileRow
              key={i}
              title={row.school}
              sub={join([row.degree, row.field_of_study, row.graduation_year])}
            />
          ))}
          <ProfileRow title={school.name} sub={format(t.classOf, { year: p.grad_year })} />
        </section>
      </div>

      <aside className={sideColumn}>
        <section className={sideBox} aria-labelledby="contact-title">
          <h2 id="contact-title" className={sideBoxTitle}>
            {format(t.contactTitle, { name: first })}
          </h2>
          {reveal.length === 0 && shared.length === 0 ? (
            <span>{t.noContact}</span>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
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
                <a
                  key={link.type}
                  className={cn(textLink, "inline-flex items-center gap-1")}
                  href={link.value}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {o.channels[link.type as (typeof LINKS)[number]]}
                  <ExternalLink aria-hidden className="size-3.5" />
                  <span className="sr-only"> {t.opensNewTab}</span>
                </a>
              ))}
            </>
          )}
        </section>
        {p.last_confirmed_at && (
          <section className={sideBox}>
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
  );
}
