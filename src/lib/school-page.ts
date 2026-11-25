// The school page (SCH-01..03, ADR 0022): the school's own links and contacts, shown to its signed-in alumni.
// Pure, so the rules are unit-tested; the database enforces the same link rules (is_https_url, is_social_links).
import type { Locale } from "@/lib/i18n";

export const SOCIAL_NETWORKS = ["facebook", "instagram", "linkedin", "youtube", "x"] as const;
export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number];

export type SchoolPage = {
  websiteUrl: string | null;
  donateUrl: string | null;
  social: Partial<Record<SocialNetwork, string>>;
  aboutEn: string | null;
  aboutFr: string | null;
  address: string | null;
  mapUrl: string | null;
  officeName: string | null;
  officeEmail: string | null;
  officePhone: string | null;
};

/** A row of school_pages, as the browser or the server reads it. */
export type SchoolPageRow = {
  website_url: string | null;
  donate_url: string | null;
  social_links: unknown;
  about_en: string | null;
  about_fr: string | null;
  address: string | null;
  map_url: string | null;
  office_name: string | null;
  office_email: string | null;
  office_phone: string | null;
};

export const EMPTY_SCHOOL_PAGE: SchoolPage = {
  websiteUrl: null,
  donateUrl: null,
  social: {},
  aboutEn: null,
  aboutFr: null,
  address: null,
  mapUrl: null,
  officeName: null,
  officeEmail: null,
  officePhone: null,
};

/** https only, a host with a dot, no user:password@ and no spaces: the same rule as the database. */
export function isHttpsUrl(value: string): boolean {
  return value.length <= 500 && /^https:\/\/[^/@\s]+\.[^/@\s]+(\/\S*)?$/.test(value);
}

const isEmail = (value: string) => value.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);

const blank = (value: string | null | undefined) => (value && value.trim() ? value.trim() : null);

/** A row (or none) as the page, dropping anything that is not a known network with a string link. */
export function schoolPageFromRow(row: SchoolPageRow | null | undefined): SchoolPage {
  if (!row) return EMPTY_SCHOOL_PAGE;
  const links =
    row.social_links && typeof row.social_links === "object" && !Array.isArray(row.social_links)
      ? (row.social_links as Record<string, unknown>)
      : {};
  const social: SchoolPage["social"] = {};
  for (const network of SOCIAL_NETWORKS) {
    const link = links[network];
    if (typeof link === "string" && isHttpsUrl(link)) social[network] = link;
  }
  return {
    websiteUrl: blank(row.website_url),
    donateUrl: blank(row.donate_url),
    social,
    aboutEn: blank(row.about_en),
    aboutFr: blank(row.about_fr),
    address: blank(row.address),
    mapUrl: blank(row.map_url),
    officeName: blank(row.office_name),
    officeEmail: blank(row.office_email),
    officePhone: blank(row.office_phone),
  };
}

/** Whether the school filled in anything: with nothing, the page and its nav entry stay hidden. */
export function hasSchoolPage(page: SchoolPage): boolean {
  return (
    Object.values(page.social).some(Boolean) ||
    [
      page.websiteUrl,
      page.donateUrl,
      page.aboutEn,
      page.aboutFr,
      page.address,
      page.mapUrl,
      page.officeName,
      page.officeEmail,
      page.officePhone,
    ].some(Boolean)
  );
}

/** The About text in the reader's language, or the other one when that is the only one filled in. */
export function aboutFor(page: SchoolPage, locale: Locale): string | null {
  return locale === "fr" ? (page.aboutFr ?? page.aboutEn) : (page.aboutEn ?? page.aboutFr);
}

/** "give.school.ca" for a button label; the address itself when it does not parse. */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** The form fields (name → value) of the admin page, as the payload of set_school_page, or "invalid". */
export function schoolPagePayload(
  get: (name: string) => string,
): { payload: Record<string, unknown> } | { error: "invalid" } {
  const urls = ["website_url", "donate_url", "map_url"] as const;
  const payload: Record<string, unknown> = {};
  for (const name of urls) {
    const value = get(name);
    if (value && !isHttpsUrl(value)) return { error: "invalid" };
    payload[name] = value;
  }
  const social: Record<string, string> = {};
  for (const network of SOCIAL_NETWORKS) {
    const value = get(`social_${network}`);
    if (!value) continue;
    if (!isHttpsUrl(value)) return { error: "invalid" };
    social[network] = value;
  }
  payload.social_links = social;
  const email = get("office_email").toLowerCase();
  if (email && !isEmail(email)) return { error: "invalid" };
  payload.office_email = email;
  const limits = {
    about_en: 4000,
    about_fr: 4000,
    address: 300,
    office_name: 120,
    office_phone: 40,
  } as const;
  for (const [name, max] of Object.entries(limits)) {
    const value = get(name);
    if (value.length > max) return { error: "invalid" };
    payload[name] = value;
  }
  return { payload };
}
