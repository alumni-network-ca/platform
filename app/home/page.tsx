import Form from "next/form";
import Link from "next/link";
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
import { cn } from "@/lib/utils";
import { confirmStillAccurate } from "./actions";
import { GraduationCap, Users } from "lucide-react";
import {
  Avatar,
  PersonCard,
  VisibilityDot,
  columns,
  eyebrow,
  frame,
  mainColumn,
  notice,
  pageTitle,
  panel,
  personGrid,
  sectionTitle,
  sideColumn,
  textLink,
} from "@/components/alumni/parts";
import { EmptyState } from "@/components/EmptyState";
import { ForwardArrow } from "@/components/icons";
import { LinkPending } from "@/components/LinkPending";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";

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
    <Avatar
      initials={initials(p.first_name, p.last_name)}
      tint={tint(p.id)}
      size={small ? "sm" : "md"}
    />
  );
  const card = (p: Card, meta: string, extra?: string) => (
    <PersonCard
      key={p.id}
      href={`/profile/${p.id}`}
      avatar={avatar(p)}
      name={displayName(p)}
      meta={meta}
      role={roleLine(p)}
    >
      {extra && <Badge className="py-1">{extra}</Badge>}
    </PersonCard>
  );
  const seeAll = cn(textLink, "text-base font-bold");
  const sidePanel = cn(panel, "flex flex-col items-start gap-3 p-5.5 text-base");

  return (
    <main data-ui className={frame.stack}>
      <div className="flex flex-col gap-1.5">
        <span className={eyebrow}>
          {format(t.eyebrow, { year: me.grad_year, network: networkName })}
        </span>
        <h1 className={pageTitle}>{format(t.welcome, { name })}</h1>
      </div>

      {askToConfirm && (
        <section
          className={cn(
            notice({ tone: "warn" }),
            "flex flex-wrap items-center justify-between gap-3.5",
          )}
          aria-label={t.freshnessLabel}
        >
          <div>
            <strong className="text-md font-bold">{t.freshnessTitle}</strong>
            <p className="mt-1">
              {me.last_confirmed_at &&
                `${format(t.lastConfirmed, { date: longDate.format(new Date(me.last_confirmed_at)) })} `}
              {t.freshnessBody}
            </p>
            {confirm === "failed" && (
              <p role="alert" className="mt-1 font-bold text-destructive">
                {t.confirmFailed}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2.5">
            <form action={confirmStillAccurate}>
              <SubmitButton>{t.stillAccurate}</SubmitButton>
            </form>
            <Button asChild variant="secondary">
              <Link href="/me">{t.updateProfile}</Link>
            </Button>
          </div>
        </section>
      )}
      {confirm === "done" && (
        <p className={notice({ tone: "good" })} role="status">
          {t.confirmed}
        </p>
      )}

      <div className={columns}>
        <div className={mainColumn}>
          <section className={cn(panel, "flex flex-col gap-4 p-6")}>
            <h2 className={sectionTitle}>{t.findTitle}</h2>
            <Form action="/directory" className="flex flex-wrap gap-2.5" role="search">
              <label htmlFor="home-q" className="sr-only">
                {t.searchLabel}
              </label>
              <Input
                id="home-q"
                name="q"
                type="search"
                placeholder={t.searchPlaceholder}
                className="w-auto flex-[1_1_280px]"
              />
              <SubmitButton>{t.search}</SubmitButton>
            </Form>
            {offers.length > 0 && (
              <div className="flex flex-col gap-2.5">
                <span id="home-offers" className="text-sm font-semibold text-subtle-foreground">
                  {t.openTo}
                </span>
                <ul aria-labelledby="home-offers" className="flex flex-wrap gap-2">
                  {offers.map((o) => (
                    <li key={o.key}>
                      <Link
                        className="inline-flex rounded-full border border-input bg-card px-3 py-[7px] text-sm font-bold text-foreground outline-none hover:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/45"
                        href={`/directory?offer=${encodeURIComponent(o.key)}`}
                      >
                        {locale === "fr" ? o.label_fr : o.label_en}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="flex flex-col gap-3.5" aria-labelledby="home-class">
            <SectionHead
              id="home-class"
              title={format(t.classTitle, { year: me.grad_year })}
              subtitle={t.classSubtitle}
            >
              {classTotal > 0 && (
                <Link className={seeAll} href={`/directory?grad_year=${me.grad_year}`}>
                  {classTotal === 1 ? t.seeClassOne : format(t.seeClass, { count: classTotal })}
                  <ForwardArrow />
                </Link>
              )}
            </SectionHead>
            {classCards.length ? (
              <div className={personGrid}>
                {classCards.map((p) => card(p, p.city ?? format(t.classOf, { year: p.grad_year })))}
              </div>
            ) : (
              <EmptyState icon={GraduationCap} title={t.classEmpty} className="py-8" />
            )}
          </section>

          <section className="flex flex-col gap-3.5" aria-labelledby="home-new">
            <SectionHead id="home-new" title={t.newTitle}>
              <Link className={seeAll} href="/directory">
                {t.browse}
                <ForwardArrow />
              </Link>
            </SectionHead>
            {newCards.length ? (
              <div className={personGrid}>
                {newCards.map((p) =>
                  card(
                    p,
                    [format(t.classOf, { year: p.grad_year }), p.city].filter(Boolean).join(" · "),
                    p.published_at
                      ? format(t.joined, { date: monthYear.format(new Date(p.published_at)) })
                      : undefined,
                  ),
                )}
              </div>
            ) : (
              <EmptyState icon={Users} title={t.newEmpty} className="py-8" />
            )}
          </section>
        </div>

        <aside className={sideColumn}>
          <section className={sidePanel}>
            <div className="flex items-center gap-3">
              {avatar(me)}
              <div className="flex min-w-0 flex-col gap-0.5">
                <h2 className="text-md font-bold">{t.profileTitle}</h2>
                {roleLine(me) && (
                  <span className="text-sm text-muted-foreground">{roleLine(me)}</span>
                )}
              </div>
            </div>
            <p className="flex items-center gap-2 font-semibold">
              <VisibilityDot on={listed} />
              {listed ? format(t.visible, { school: shortName }) : t.hidden}
            </p>
            <Link className={textLink} href="/me">
              {t.viewProfile}
            </Link>
            <Link className={textLink} href="/me#visibility">
              {t.changeVisibility}
            </Link>
          </section>

          <section className={sidePanel}>
            <h2 className="text-md font-bold">{t.contactedTitle}</h2>
            {contacted.length > 0 && (
              <ul className="flex w-full flex-col gap-2.5">
                {contacted.map((c) => (
                  <li key={c.recipient_profile_id}>
                    <Link
                      className="group relative flex items-center gap-2.5 rounded-md font-medium text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/45"
                      href={`/profile/${c.person.id}`}
                      prefetch={false}
                    >
                      {avatar(c.person, true)}
                      <span className="flex min-w-0 flex-col gap-px">
                        <strong className="group-hover:underline">{displayName(c.person)}</strong>
                        <span className="text-sm text-muted-foreground">
                          {all.onboarding.channels[
                            c.channel as keyof typeof all.onboarding.channels
                          ] ?? c.channel}{" "}
                          · {shortDate.format(new Date(c.created_at))}
                        </span>
                      </span>
                      <LinkPending className="inset-x-0 -bottom-1 text-primary" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-sm text-muted-foreground">{t.contactedNote}</p>
          </section>

          <section className={sidePanel}>
            <h2 className="text-md font-bold">{t.privacyTitle}</h2>
            <p className="text-subtle-foreground">{format(t.privacyBody, { school: shortName })}</p>
            {replyTo && (
              <a className={textLink} href={`mailto:${replyTo}`}>
                {t.contactOffice}
              </a>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}

/** A section's title (and a line under it) with its "see all" link on the right. */
function SectionHead({
  id,
  title,
  subtitle,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <div>
        <h2 id={id} className={sectionTitle}>
          {title}
        </h2>
        {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
