import Link from "next/link";
import { DirectoryForm, DirectoryResults, FilterPanel } from "@/components/directory/DirectoryForm";
import { AVATAR_TINTS } from "@/config/ui";
import { requireAccess } from "@/lib/auth/account";
import { PAGE_SIZE, activeChips, pages, readFilters, rpcFilters } from "@/lib/directory/filters";
import { format, translations } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n-server";
import { initials, optionsFor } from "@/lib/profile/fields";
import { schoolBranding } from "@/lib/school";
import { schoolConfig } from "@/lib/tenant/config";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Search, SearchX, X } from "lucide-react";
import {
  Avatar,
  PersonCard,
  Tags,
  columns,
  directoryGrid,
  eyebrow,
  frame,
  pageTitle,
  textLink,
} from "@/components/alumni/parts";
import { EmptyState } from "@/components/EmptyState";
import { BackArrow, ForwardArrow } from "@/components/icons";
import { SubmitButton } from "@/components/ui/submit-button";

// The alumni directory (DIR-02; design Directory). Every filter is in the URL; search_directory returns only
// published profiles at this school, and only to someone who may use the directory (RLS and has_permission).

type Facet = { value: string; count: number };
type Facets = { total: number; cities: Facet[]; schools: Facet[]; decades: Facet[] };

/** Avatar colours from the design, one per person so the grid is easy to scan. */
const tint = (id: string) =>
  AVATAR_TINTS[parseInt(id.replace(/-/g, "").slice(-6), 16) % AVATAR_TINTS.length];

async function read<T>(query: PromiseLike<{ data: T; error: { message: string } | null }>) {
  const { data, error } = await query;
  if (error) throw new Error(`Could not load the directory: ${error.message}`);
  return data;
}

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { school, supabase } = await requireAccess("/directory");
  const locale = await getServerLocale();
  const t = translations[locale].directory;
  const f = readFilters(await searchParams);
  const [rows, facets, config] = await Promise.all([
    read(
      supabase.rpc("search_directory", {
        p_inst: school.id,
        p_filters: rpcFilters(f),
        p_limit: PAGE_SIZE,
        p_offset: (f.page - 1) * PAGE_SIZE,
        p_sort: f.sort,
      }),
    ),
    read(supabase.rpc("directory_facets", { p_inst: school.id })),
    schoolConfig(school.id),
  ]);
  const { total: members, cities, schools, decades } = facets as unknown as Facets;
  const label = (row: { label_en: string; label_fr: string }) =>
    locale === "fr" ? row.label_fr : row.label_en;
  const fields = optionsFor(config.career_fields, school.id);
  const offers = optionsFor(config.offer_types, school.id);
  const offerLabel = (key: string) => {
    const offer = offers.find((o) => o.key === key);
    return offer ? label(offer) : key;
  };
  const decadeLabel = (decade: number) => format(t.decade, { decade });
  const classOf = (year: number) => format(t.classOf, { year });
  const people = rows ?? [];
  const total = Number(people[0]?.total_count ?? 0);
  const page = pages(f, total);
  const chips = activeChips(f, {
    field: (key) => {
      const field = fields.find((x) => x.key === key);
      return field ? label(field) : key;
    },
    offer: offerLabel,
    decade: decadeLabel,
    classOf,
  });
  const { shortName } = schoolBranding(school);

  return (
    <main data-ui className={frame.stack}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className={eyebrow}>{t.eyebrow}</span>
          <h1 className={pageTitle}>{format(t.title, { school: shortName })}</h1>
        </div>
        <span className="text-base text-muted-foreground tabular-nums">
          {format(t.members, { count: members })}
        </span>
      </div>

      <DirectoryForm>
        <div
          className="flex items-center gap-3 rounded-lg border border-input bg-card py-1.5 pr-1.5 pl-4.5 shadow-xs transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/25"
          role="search"
        >
          <Search
            aria-hidden
            size={20}
            strokeWidth={2.2}
            className="shrink-0 text-muted-foreground"
          />
          <label htmlFor="dir-q" className="sr-only">
            {t.searchLabel}
          </label>
          <input
            id="dir-q"
            name="q"
            type="search"
            defaultValue={f.q}
            placeholder={t.searchPlaceholder}
            className="min-w-0 flex-1 bg-transparent py-3 text-[1rem] text-foreground outline-none placeholder:text-placeholder"
          />
          <SubmitButton className="h-10 rounded-sm">{t.search}</SubmitButton>
        </div>

        <div className={columns}>
          <FilterPanel
            label={t.filters}
            toggleLabel={chips.length ? format(t.filtersCount, { count: chips.length }) : t.filters}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-md font-bold">{t.filters}</h2>
              <Link href="/directory" className={cn(textLink, "text-sm font-bold")}>
                {t.clear}
              </Link>
            </div>
            <Select
              name="field"
              label={t.careerField}
              any={t.anyField}
              value={f.field}
              options={fields.map((x) => ({ value: x.key, label: label(x) }))}
            />
            <Select
              name="school"
              label={t.university}
              any={t.anyUniversity}
              value={f.school}
              options={schools.map((x) => ({ value: x.value, label: x.value }))}
            />
            <Select
              name="city"
              label={t.city}
              any={t.anywhere}
              value={f.city}
              options={cities.map((x) => ({ value: x.value, label: x.value }))}
            />
            <Select
              name="class"
              label={t.gradClass}
              any={t.anyYear}
              value={f.decade === null ? "" : String(f.decade)}
              options={decades.map((x) => ({
                value: x.value,
                label: decadeLabel(Number(x.value)),
              }))}
            />
            {/* The home page's "your class" link: kept until its chip removes it. */}
            {f.gradYear !== null && <input type="hidden" name="grad_year" value={f.gradYear} />}
            <fieldset className="min-w-0">
              <legend className="mb-2.5 text-sm font-semibold">{t.openTo}</legend>
              <div className="flex flex-wrap gap-2">
                {offers.map((offer) => (
                  // A toggle button to look at; the checkbox inside stays for keyboards and the form. A label too long
                  // for one line wraps in a rounded box rather than a stretched pill.
                  <label
                    key={offer.key}
                    className="relative inline-flex cursor-pointer items-center rounded-xl border border-input bg-card px-3 py-[7px] text-sm font-bold transition-colors hover:border-primary has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:ring-[3px] has-focus-visible:ring-ring/45"
                  >
                    <input
                      type="checkbox"
                      name="offer"
                      value={offer.key}
                      defaultChecked={f.offers.includes(offer.key)}
                      className="sr-only"
                    />
                    {label(offer)}
                  </label>
                ))}
              </div>
            </fieldset>
            <SubmitButton variant="secondary" className="self-start">
              {t.apply}
            </SubmitButton>
          </FilterPanel>

          <DirectoryResults label={t.results}>
            <div className="flex flex-wrap items-center justify-between gap-3 text-base text-muted-foreground">
              <span role="status" className="tabular-nums">
                {total
                  ? format(t.showing, { from: page.from, to: page.to, total })
                  : t.noResultsCount}
              </span>
              <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                {t.sort}
                <NativeSelect name="sort" defaultValue={f.sort} wrapperClassName="w-auto">
                  <option value="recent">{t.sortRecent}</option>
                  <option value="name">{t.sortName}</option>
                </NativeSelect>
              </label>
            </div>

            {chips.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2">
                <ul aria-label={t.activeFilters} className="flex flex-wrap gap-2">
                  {chips.map((chip) => (
                    <li key={chip.key}>
                      <Link
                        href={chip.href}
                        className="inline-flex items-center gap-1 rounded-xl bg-primary-tint px-3 py-1.5 text-sm font-bold text-primary-hover outline-none hover:ring-1 hover:ring-primary/40 focus-visible:ring-[3px] focus-visible:ring-ring/45"
                      >
                        {chip.label}
                        <X aria-hidden className="size-3.5 shrink-0" />
                        <span className="sr-only"> ({t.removeFilter})</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link href="/directory" className={cn(textLink, "text-sm font-bold")}>
                  {t.resetAll}
                </Link>
              </div>
            )}

            {people.length > 0 ? (
              <ul className={directoryGrid}>
                {people.map((p) => (
                  <li key={p.id}>
                    <PersonCard
                      href={`/profile/${p.id}`}
                      avatar={
                        <Avatar
                          initials={initials(p.preferred_name || p.first_name, p.last_name)}
                          tint={tint(p.id)}
                        />
                      }
                      name={`${p.preferred_name || p.first_name} ${p.last_name}`}
                      meta={[classOf(p.grad_year), p.city].filter(Boolean).join(" · ")}
                      role={[p.job_title, p.employer].filter(Boolean).join(" · ")}
                    >
                      {p.offers.length > 0 && <Tags labels={p.offers.map(offerLabel)} max={2} />}
                    </PersonCard>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={SearchX}
                title={t.noResults}
                action={
                  chips.length > 0 && (
                    <Button asChild variant="secondary">
                      <Link href="/directory">{t.resetAll}</Link>
                    </Button>
                  )
                }
              />
            )}

            {page.last > 1 && (
              <nav
                className="flex items-center justify-between gap-3 text-base text-muted-foreground tabular-nums"
                aria-label={t.pagination}
              >
                {page.previous ? (
                  <Button asChild variant="ghost" className="text-primary">
                    <Link href={page.previous}>
                      <BackArrow className="mr-0" />
                      {t.previous}
                    </Link>
                  </Button>
                ) : (
                  <span />
                )}
                <span>{format(t.pageOf, { page: f.page, pages: page.last })}</span>
                {page.next ? (
                  <Button asChild variant="ghost" className="text-primary">
                    <Link href={page.next}>
                      {t.next}
                      <ForwardArrow className="ml-0" />
                    </Link>
                  </Button>
                ) : (
                  <span />
                )}
              </nav>
            )}
          </DirectoryResults>
        </div>
      </DirectoryForm>
    </main>
  );
}

function Select({
  name,
  label,
  any,
  value,
  options,
}: {
  name: string;
  label: string;
  any: string;
  value: string;
  options: { value: string; label: string }[];
}) {
  const id = `dir-${name}`;
  // A value from a shared link that the list no longer offers still shows, so the filter stays visible.
  const all =
    value && !options.some((o) => o.value === value)
      ? [{ value, label: value }, ...options]
      : options;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <NativeSelect id={id} name={name} defaultValue={value}>
        <option value="">{any}</option>
        {all.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}
