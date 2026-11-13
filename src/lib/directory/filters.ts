// The directory's filters (DIR-02) live in the URL, so a search can be shared and the back button works. Pure:
// it reads the query string, builds search_directory's filters and the links that change one filter.

export const PAGE_SIZE = 24;
export type Sort = "recent" | "name";

export type Filters = {
  q: string;
  /** A career field key. */
  field: string;
  /** A university, as the facets list it. */
  school: string;
  city: string;
  /** The first year of a decade: 2010 means 2010 to 2019. */
  decade: number | null;
  /** One class, from the home page's "your class" link. */
  gradYear: number | null;
  /** "Open to" options that must all match. */
  offers: string[];
  sort: Sort;
  page: number;
};

type Params = Record<string, string | string[] | undefined>;

const one = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
const many = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value : value ? [value] : []).map((v) => v.trim()).filter(Boolean);
const year = (value: string) => (/^\d{4}$/.test(value) ? Number(value) : null);

export function readFilters(params: Params): Filters {
  const decade = year(one(params.class));
  const page = Number(one(params.page));
  return {
    q: one(params.q).slice(0, 100),
    field: one(params.field),
    school: one(params.school),
    city: one(params.city),
    decade: decade !== null && decade % 10 === 0 ? decade : null,
    gradYear: year(one(params.grad_year)),
    offers: [...new Set(many(params.offer))],
    sort: one(params.sort) === "name" ? "name" : "recent",
    page: Number.isSafeInteger(page) && page > 1 ? page : 1,
  };
}

/** search_directory's p_filters: only the filters in use. */
export function rpcFilters(f: Filters): Record<string, string | number | string[]> {
  const out: Record<string, string | number | string[]> = {};
  if (f.q) out.q = f.q;
  if (f.field) out.career_field = f.field;
  if (f.school) out.school = f.school;
  if (f.city) out.city = f.city;
  if (f.decade !== null) {
    out.class_from = f.decade;
    out.class_to = f.decade + 9;
  }
  if (f.gradYear !== null) out.grad_year = f.gradYear;
  if (f.offers.length) out.offers = f.offers;
  return out;
}

/** The query string for a set of filters, without defaults (page 1, the recent sort). */
export function queryString(f: Filters): string {
  const params = new URLSearchParams();
  if (f.q) params.set("q", f.q);
  if (f.field) params.set("field", f.field);
  if (f.school) params.set("school", f.school);
  if (f.city) params.set("city", f.city);
  if (f.decade !== null) params.set("class", String(f.decade));
  if (f.gradYear !== null) params.set("grad_year", String(f.gradYear));
  for (const offer of f.offers) params.append("offer", offer);
  if (f.sort !== "recent") params.set("sort", f.sort);
  if (f.page > 1) params.set("page", String(f.page));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export const directoryHref = (f: Filters) => `/directory${queryString(f)}`;

export type Chip = { key: string; label: string; href: string };

/**
 * One chip per filter in use, each linking to the same search without it (and back to page 1). Labels come
 * from the caller, which knows the school's names for fields and options.
 */
export function activeChips(
  f: Filters,
  label: {
    field: (key: string) => string;
    offer: (key: string) => string;
    decade: (decade: number) => string;
    classOf: (year: number) => string;
  },
): Chip[] {
  const without = (change: Partial<Filters>) => directoryHref({ ...f, ...change, page: 1 });
  const chips: Chip[] = [];
  if (f.q) chips.push({ key: "q", label: `“${f.q}”`, href: without({ q: "" }) });
  if (f.field)
    chips.push({ key: "field", label: label.field(f.field), href: without({ field: "" }) });
  if (f.school) chips.push({ key: "school", label: f.school, href: without({ school: "" }) });
  if (f.city) chips.push({ key: "city", label: f.city, href: without({ city: "" }) });
  if (f.decade !== null)
    chips.push({ key: "class", label: label.decade(f.decade), href: without({ decade: null }) });
  if (f.gradYear !== null)
    chips.push({
      key: "grad_year",
      label: label.classOf(f.gradYear),
      href: without({ gradYear: null }),
    });
  for (const offer of f.offers)
    chips.push({
      key: `offer:${offer}`,
      label: label.offer(offer),
      href: without({ offers: f.offers.filter((o) => o !== offer) }),
    });
  return chips;
}

/** The pages either side of this one, when they exist. */
export function pages(f: Filters, total: number) {
  const last = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return {
    last,
    previous: f.page > 1 ? directoryHref({ ...f, page: f.page - 1 }) : null,
    next: f.page < last ? directoryHref({ ...f, page: f.page + 1 }) : null,
    from: total ? (f.page - 1) * PAGE_SIZE + 1 : 0,
    to: Math.min(total, f.page * PAGE_SIZE),
  };
}
