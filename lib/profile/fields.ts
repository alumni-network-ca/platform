// The alumnus's own profile, as the onboarding wizard (ONB-05) and /me (PRF-02) edit it. Pure, so every check is
// unit-tested. The checks mirror the database's (save_my_profile and the table constraints): a form error is
// caught before the RPC, and the database stays the final word (PRF-01).

export const STEPS = [
  "welcome",
  "about",
  "education",
  "career",
  "networking",
  "contact",
  "publish",
] as const;
export type Step = (typeof STEPS)[number];

/** The steps with fields of their own: /me edits each one on its own page. */
export type Section = Exclude<Step, "publish">;
export const SECTIONS = [
  "about",
  "education",
  "career",
  "networking",
  "contact",
] as const satisfies readonly Section[];
export const isSection = (value: string): value is (typeof SECTIONS)[number] =>
  (SECTIONS as readonly string[]).includes(value);

export const isStep = (value: string): value is Step =>
  (STEPS as readonly string[]).includes(value);

/** The step to resume at. onboarding_step counts the steps already saved (0 = none yet). */
export const resumeStep = (saved: number): Step =>
  STEPS[Math.min(Math.max(saved, 0), STEPS.length - 1)]!;

/** The privacy policy and terms the consent refers to (the seed's version). Bump it when PUB-02 changes them. */
export const POLICY_VERSION = "2026-10";

export const LANGUAGES = ["en", "fr", "he", "es", "other"] as const;
export const CHANNELS = ["email", "phone", "linkedin", "facebook", "instagram", "website"] as const;
export type Channel = (typeof CHANNELS)[number];
export type Visibility = "members" | "hidden";

/** Lengths the UI allows. The bio is shorter than the database's 1000 (the design's 300). */
export const MAX = {
  name: 80,
  place: 80,
  bio: 300,
  title: 120,
  school: 120,
  channel: 300,
} as const;

export type FieldError =
  | {
      code:
        | "required"
        | "year"
        | "yearOrder"
        | "email"
        | "phone"
        | "url"
        | "careerField"
        | "consent"
        | "confirm";
    }
  | { code: "tooLong"; max: number }
  | { code: "platform"; channel: Channel };
export type Errors = Record<string, FieldError>;
export type Parsed<T> = { ok: true; data: T } | { ok: false; errors: Errors };

/** What a parser reads from a submitted form: one value, or every value of a repeated field in order. */
export type FormReader = { get(name: string): string; all(name: string): string[] };

export function readForm(form: FormData): FormReader {
  return {
    get: (name) => String(form.get(name) ?? "").trim(),
    all: (name) => form.getAll(name).map((value) => String(value).trim()),
  };
}

class Checker {
  errors: Errors = {};
  text(field: string, value: string, max: number, required = false) {
    if (required && !value) this.errors[field] = { code: "required" };
    else if (value.length > max) this.errors[field] = { code: "tooLong", max };
    return value;
  }
  year(field: string, value: string, required = false): number | null {
    if (!value) {
      if (required) this.errors[field] = { code: "required" };
      return null;
    }
    const year = Number(value);
    if (!/^\d{4}$/.test(value) || year < 1900 || year > 2100) {
      this.errors[field] = { code: "year" };
      return null;
    }
    return year;
  }
  done<T>(data: T): Parsed<T> {
    return Object.keys(this.errors).length
      ? { ok: false, errors: this.errors }
      : { ok: true, data };
  }
}

export type About = {
  profile: {
    first_name: string;
    last_name: string;
    city: string;
    country: string;
    bio: string;
    languages: string[];
  };
  private: { maiden_name: string };
};

export function parseAbout(form: FormReader): Parsed<About> {
  const c = new Checker();
  return c.done({
    profile: {
      first_name: c.text("first_name", form.get("first_name"), MAX.name, true),
      last_name: c.text("last_name", form.get("last_name"), MAX.name, true),
      city: c.text("city", form.get("city"), MAX.place),
      country: c.text("country", form.get("country"), MAX.place),
      bio: c.text("bio", form.get("bio"), MAX.bio),
      languages: form
        .all("languages")
        .filter((code) => (LANGUAGES as readonly string[]).includes(code)),
    },
    private: { maiden_name: c.text("maiden_name", form.get("maiden_name"), MAX.name) },
  });
}

export type EducationRow = {
  school: string;
  degree: string;
  field_of_study: string;
  graduation_year: number | null;
};

/** Repeated rows: blank rows are dropped, so an empty "Add a school" row is not an error. */
export function parseEducation(form: FormReader): Parsed<{ education: EducationRow[] }> {
  const c = new Checker();
  const [schools, degrees, fields, years] = [
    form.all("school"),
    form.all("degree"),
    form.all("field_of_study"),
    form.all("graduation_year"),
  ];
  const education = schools
    .map((school, i) => ({
      i,
      school,
      degree: degrees[i] ?? "",
      field: fields[i] ?? "",
      year: years[i] ?? "",
    }))
    .filter((row) => row.school || row.degree || row.field || row.year)
    .map(({ i, school, degree, field, year }) => ({
      school: c.text(`school.${i}`, school, MAX.school, true),
      degree: c.text(`degree.${i}`, degree, MAX.school),
      field_of_study: c.text(`field_of_study.${i}`, field, MAX.school),
      graduation_year: c.year(`graduation_year.${i}`, year),
    }));
  return c.done({ education });
}

export type ExperienceRow = {
  job_title: string;
  employer: string;
  location: string;
  start_year: number | null;
  end_year: number | null;
  is_current: boolean;
};

export type Career = {
  profile: { career_field_id: string; job_title: string; employer: string };
  experience: ExperienceRow[];
};

/**
 * The current role lives on the profile (the directory shows it); other roles are experience rows. A row
 * already marked current keeps that flag (role_current) and has no end year, as the database requires.
 */
export function parseCareer(form: FormReader, careerFieldIds: readonly string[]): Parsed<Career> {
  const c = new Checker();
  const field = form.get("career_field_id");
  if (field && !careerFieldIds.includes(field)) c.errors.career_field_id = { code: "careerField" };
  const [titles, employers, locations, starts, ends, currents] = [
    form.all("role_title"),
    form.all("role_employer"),
    form.all("role_location"),
    form.all("role_start"),
    form.all("role_end"),
    form.all("role_current"),
  ];
  const experience = titles
    .map((title, i) => ({
      i,
      title,
      employer: employers[i] ?? "",
      location: locations[i] ?? "",
      start: starts[i] ?? "",
      end: ends[i] ?? "",
      current: currents[i] === "true",
    }))
    .filter((row) => row.title || row.employer || row.location || row.start || row.end)
    .map(({ i, title, employer, location, start, end, current }) => {
      const row: ExperienceRow = {
        job_title: c.text(`role_title.${i}`, title, MAX.title, true),
        employer: c.text(`role_employer.${i}`, employer, MAX.title),
        location: c.text(`role_location.${i}`, location, MAX.title),
        start_year: c.year(`role_start.${i}`, start),
        end_year: current ? null : c.year(`role_end.${i}`, end),
        is_current: current,
      };
      if (row.start_year && row.end_year && row.end_year < row.start_year)
        c.errors[`role_end.${i}`] = { code: "yearOrder" };
      return row;
    });
  return c.done({
    profile: {
      career_field_id: field,
      job_title: c.text("job_title", form.get("job_title"), MAX.title),
      employer: c.text("employer", form.get("employer"), MAX.title),
    },
    experience,
  });
}

/** Only keys the school offers are kept. */
export function parseOffers(form: FormReader, offerKeys: readonly string[]): { offers: string[] } {
  return { offers: [...new Set(form.all("offers"))].filter((key) => offerKeys.includes(key)) };
}

export type ChannelRow = { type: Channel; value: string; is_public: boolean };

const HOSTS: Partial<Record<Channel, string>> = {
  linkedin: "linkedin.com",
  facebook: "facebook.com",
  instagram: "instagram.com",
};

/** A phone number as the database stores it (E.164): "+1 (514) 555-0123" → "+15145550123". */
export const normalizePhone = (value: string) => value.replace(/[\s().-]/g, "");

/** Adds https:// when someone types "linkedin.com/in/dana". */
export const normalizeUrl = (value: string) =>
  /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;

function channelError(type: Channel, value: string): FieldError | null {
  if (type === "email") return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value) ? null : { code: "email" };
  if (type === "phone") return /^\+[1-9][0-9]{6,14}$/.test(value) ? null : { code: "phone" };
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { code: "url" };
  }
  if (url.protocol !== "https:" || /\s/.test(value)) return { code: "url" };
  const host = HOSTS[type];
  if (host && url.hostname !== host && !url.hostname.endsWith(`.${host}`))
    return { code: "platform", channel: type };
  return null;
}

/** Each channel is optional (DEC-02). A value is kept with its "show on my profile" choice. */
export function parseChannels(form: FormReader): Parsed<{ channels: ChannelRow[] }> {
  const c = new Checker();
  const channels: ChannelRow[] = [];
  for (const type of CHANNELS) {
    const raw = form.get(type);
    if (!raw) continue;
    const value =
      type === "phone" ? normalizePhone(raw) : type === "email" ? raw : normalizeUrl(raw);
    const error =
      value.length > MAX.channel
        ? { code: "tooLong" as const, max: MAX.channel }
        : channelError(type, value);
    if (error) c.errors[type] = error;
    channels.push({ type, value, is_public: form.get(`${type}_public`) === "on" });
  }
  return c.done({ channels });
}

export function parsePublish(form: FormReader): Parsed<{ visibility: Visibility }> {
  const c = new Checker();
  if (form.get("consent") !== "on") c.errors.consent = { code: "consent" };
  return c.done({ visibility: form.get("visibility") === "members" ? "members" : "hidden" });
}

/** How recent a sign-in must be to delete a profile (PRF-06's re-authentication). */
export const REAUTH_MINUTES = 15;

export const signedInRecently = (lastSignInAt: string | null | undefined, now: Date) =>
  Boolean(lastSignInAt) && now.getTime() - Date.parse(lastSignInAt!) < REAUTH_MINUTES * 60_000;

/** Initials for an avatar: "Dana Levy" → "DL". */
export const initials = (first: string, last: string) =>
  `${first.trim().charAt(0)}${last.trim().charAt(0)}`.toUpperCase();

/** School-specific options override the platform's by key; inactive ones are dropped. */
export function optionsFor<
  T extends { key: string; institution_id: string | null; is_active: boolean; sort_order: number },
>(rows: readonly T[], institutionId: string): T[] {
  const byKey = new Map<string, T>();
  for (const row of rows) {
    if (row.institution_id !== null && row.institution_id !== institutionId) continue;
    const known = byKey.get(row.key);
    if (!known || (known.institution_id === null && row.institution_id !== null))
      byKey.set(row.key, row);
  }
  return [...byKey.values()]
    .filter((row) => row.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);
}
