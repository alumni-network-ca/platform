import { ExternalLink } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { panel, sectionTitle, textLink } from "@/components/alumni/parts";
import { aboutFor, hostOf, SOCIAL_NETWORKS, type SchoolPage } from "@/lib/school-page";
import { format, translations, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// The school page as alumni read it (design SchoolPage, SCH-03). Shared by /school and the admin preview, so what
// an admin previews is what alumni get. Only the fields the school filled in appear. Every outside link opens in a
// new tab, and the donate button says the person is leaving this site.

const card = cn(panel, "flex flex-col gap-3 p-6");
const pill =
  "rounded-full border border-border-strong px-4 py-2 text-sm font-bold text-foreground no-underline outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/45";

function External({
  href,
  className,
  children,
  newTab,
}: {
  href: string;
  className: string;
  children: React.ReactNode;
  newTab: string;
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
      <span className="sr-only"> {newTab}</span>
    </a>
  );
}

export function SchoolPageView({
  page,
  locale,
  school,
  shortName,
}: {
  page: SchoolPage;
  locale: Locale;
  school: string;
  shortName: string;
}) {
  const t = translations[locale].schoolPage;
  const network = format(translations[locale].nav.networkName, { school: shortName });
  const about = aboutFor(page, locale);
  const social = SOCIAL_NETWORKS.filter((key) => page.social[key]);
  const hasSupport = page.donateUrl || page.websiteUrl;
  const hasOffice = page.officeName || page.officeEmail || page.officePhone;
  const hasPlace = page.address || page.mapUrl;
  const out = <ExternalLink aria-hidden="true" className="size-4" />;
  return (
    <div className="flex flex-wrap items-start gap-6">
      <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-5">
        {about && (
          <section className={card}>
            <h2 className={sectionTitle}>{t.about}</h2>
            <p className="text-md leading-relaxed whitespace-pre-line text-subtle-foreground">
              {about}
            </p>
          </section>
        )}
        {hasSupport && (
          <section className={card}>
            <h2 className={sectionTitle}>{t.support}</h2>
            {page.donateUrl && (
              <p className="rounded-md border bg-background px-3.5 py-3 text-sm leading-normal text-subtle-foreground">
                {format(t.leaveNote, { network, school })}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              {page.donateUrl && (
                <External
                  href={page.donateUrl}
                  newTab={t.newTab}
                  className={buttonVariants({ size: "lg" })}
                >
                  {format(t.donate, { host: hostOf(page.donateUrl) })}
                  {out}
                </External>
              )}
              {page.websiteUrl && (
                <External
                  href={page.websiteUrl}
                  newTab={t.newTab}
                  className={buttonVariants({ variant: "secondary", size: "lg" })}
                >
                  {t.website}
                  {out}
                </External>
              )}
            </div>
          </section>
        )}
        {social.length > 0 && (
          <section className={card}>
            <h2 className={sectionTitle}>{format(t.follow, { school: shortName })}</h2>
            <ul className="flex flex-wrap gap-2.5">
              {social.map((key) => (
                <li key={key}>
                  <External href={page.social[key]!} newTab={t.newTab} className={pill}>
                    {t.networks[key]}
                  </External>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      {(hasOffice || hasPlace) && (
        <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-5">
          {hasOffice && (
            <section className={card}>
              <h2 className={sectionTitle}>{t.office}</h2>
              {page.officeName && <span className="text-md font-bold">{page.officeName}</span>}
              {page.officeEmail && (
                <a href={`mailto:${page.officeEmail}`} className={cn(textLink, "break-all")}>
                  {page.officeEmail}
                </a>
              )}
              {page.officePhone && (
                <a href={`tel:${page.officePhone.replace(/[^\d+]/g, "")}`} className={textLink}>
                  {page.officePhone}
                </a>
              )}
            </section>
          )}
          {hasPlace && (
            <section className={card}>
              <h2 className={sectionTitle}>{t.find}</h2>
              {page.address && (
                <address className="text-md leading-normal whitespace-pre-line text-subtle-foreground not-italic">
                  {page.address}
                </address>
              )}
              {page.mapUrl && (
                <External href={page.mapUrl} newTab={t.newTab} className={textLink}>
                  {t.openMap} ↗
                </External>
              )}
            </section>
          )}
        </aside>
      )}
    </div>
  );
}
