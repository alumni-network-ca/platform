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
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Search, X } from "lucide-react";
import { BackArrow, ForwardArrow } from "@/components/icons";
import { LinkPending } from "@/components/LinkPending";
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
    <main className="dir">
      <div className="dirHead">
        <div>
          <span className="dirEyebrow">{t.eyebrow}</span>
          <h1>{format(t.title, { school: shortName })}</h1>
        </div>
        <span className="dirCount">{format(t.members, { count: members })}</span>
      </div>

      <DirectoryForm>
        <div className="dirSearch" role="search">
          <Search
            aria-hidden
            size={20}
            strokeWidth={2.2}
            className="shrink-0 text-muted-foreground"
          />
          <label htmlFor="dir-q" className="srOnly">
            {t.searchLabel}
          </label>
          <input
            id="dir-q"
            name="q"
            type="search"
            defaultValue={f.q}
            placeholder={t.searchPlaceholder}
          />
          <SubmitButton className="h-10 rounded-sm">{t.search}</SubmitButton>
        </div>

        <div className="dirBody">
          <FilterPanel
            label={t.filters}
            toggleLabel={chips.length ? format(t.filtersCount, { count: chips.length }) : t.filters}
          >
            <div className="dirPanelHead">
              <h2>{t.filters}</h2>
              <Link href="/directory" className="dirClear">
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
            <fieldset className="dirOffers">
              <legend>{t.openTo}</legend>
              <div>
                {offers.map((offer) => (
                  <label key={offer.key} className="dirChip">
                    <input
                      type="checkbox"
                      name="offer"
                      value={offer.key}
                      defaultChecked={f.offers.includes(offer.key)}
                    />
                    {label(offer)}
                  </label>
                ))}
              </div>
            </fieldset>
            <SubmitButton variant="secondary" className="dirApply">
              {t.apply}
            </SubmitButton>
          </FilterPanel>

          <DirectoryResults label={t.results}>
            <div className="dirResultsHead">
              <span role="status">
                {total
                  ? format(t.showing, { from: page.from, to: page.to, total })
                  : t.noResultsCount}
              </span>
              <label className="dirSort">
                {t.sort}
                <NativeSelect name="sort" defaultValue={f.sort} wrapperClassName="w-auto">
                  <option value="recent">{t.sortRecent}</option>
                  <option value="name">{t.sortName}</option>
                </NativeSelect>
              </label>
            </div>

            {chips.length > 0 && (
              <div className="dirChips">
                <ul aria-label={t.activeFilters}>
                  {chips.map((chip) => (
                    <li key={chip.key}>
                      <Link href={chip.href}>
                        {chip.label}
                        <X aria-hidden className="ml-1 inline-block size-3.5 align-[-0.15em]" />
                        <span className="srOnly"> ({t.removeFilter})</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link href="/directory" className="dirClear">
                  {t.resetAll}
                </Link>
              </div>
            )}

            {people.length > 0 ? (
              <ul className="dirGrid">
                {people.map((p) => {
                  const name = `${p.preferred_name || p.first_name} ${p.last_name}`;
                  const role = [p.job_title, p.employer].filter(Boolean).join(" · ");
                  const shown = p.offers.slice(0, 2);
                  return (
                    <li key={p.id}>
                      {/* Not prefetched: a profile checks access in its layout, one read per card. */}
                      <Link className="dirCard relative" href={`/profile/${p.id}`} prefetch={false}>
                        <span className="dirCardHead">
                          <span
                            className="dirAvatar"
                            style={{ background: tint(p.id) }}
                            aria-hidden="true"
                          >
                            {initials(p.preferred_name || p.first_name, p.last_name)}
                          </span>
                          <span className="dirCardWho">
                            <span className="dirCardName">{name}</span>
                            <span>
                              {[classOf(p.grad_year), p.city].filter(Boolean).join(" · ")}
                            </span>
                          </span>
                        </span>
                        {role && <span className="dirCardRole">{role}</span>}
                        {shown.length > 0 && (
                          <span className="dirTags">
                            {shown.map((key) => (
                              <span key={key}>{offerLabel(key)}</span>
                            ))}
                            {p.offers.length > shown.length && (
                              <span>+{p.offers.length - shown.length}</span>
                            )}
                          </span>
                        )}
                        <LinkPending className="inset-x-[18px] bottom-2 text-primary" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="dirEmpty">
                <p>{t.noResults}</p>
                {chips.length > 0 && (
                  <Button asChild variant="secondary">
                    <Link href="/directory">{t.resetAll}</Link>
                  </Button>
                )}
              </div>
            )}

            {page.last > 1 && (
              <nav className="dirPages" aria-label={t.pagination}>
                {page.previous ? (
                  <Link href={page.previous}>
                    <BackArrow />
                    {t.previous}
                  </Link>
                ) : (
                  <span />
                )}
                <span>{format(t.pageOf, { page: f.page, pages: page.last })}</span>
                {page.next ? (
                  <Link href={page.next}>
                    {t.next}
                    <ForwardArrow />
                  </Link>
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
    <div className="dirField">
      <label htmlFor={id}>{label}</label>
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
