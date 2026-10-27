// Performance seed (FND-15): 10,000 published alumni per school on the LOCAL stack, for the directory
// performance check (QA-04: search_directory p95 under 300 ms at 10k profiles per school). Each person gets an
// education row, a current job, a public LinkedIn link, an email channel and a few offers.
//
//   npm run seed:perf                  # 10,000 per school
//   npm run seed:perf -- --count 2000  # fewer
//
// Ids are fixed (99999999-…), so running it again adds nothing. `supabase db reset` removes the data.
// It refuses to run against anything but the local stack: seeds never reach staging or production.
import { parseArgs } from "node:util";
import { adminClient, isLocal, localStack } from "./lib/supabase-admin.ts";
import type { Database } from "@/lib/database";

type Insert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

const { values } = parseArgs({ options: { count: { type: "string", default: "10000" } } });
const count = Number(values.count);
if (!Number.isInteger(count) || count < 1 || count > 50_000) {
  console.error("--count must be a whole number between 1 and 50000.");
  process.exit(1);
}

const target = localStack();
if (!isLocal(target.url)) {
  console.error(`Refusing to seed ${target.url}: the perf seed only runs on the local stack.`);
  process.exit(1);
}
const db = adminClient(target);
const BATCH = 1000;

const FIRST = [
  "Adam",
  "Adina",
  "Alexandre",
  "Ariel",
  "Audrey",
  "Avi",
  "Benjamin",
  "Camille",
  "Chloe",
  "Daniel",
  "David",
  "Dina",
  "Eli",
  "Elise",
  "Emma",
  "Ethan",
  "Gabriel",
  "Hannah",
  "Ilan",
  "Isaac",
  "Jacob",
  "Jonathan",
  "Julie",
  "Laura",
  "Leah",
  "Liam",
  "Lior",
  "Maya",
  "Michael",
  "Nathan",
  "Noa",
  "Noah",
  "Olivia",
  "Rachel",
  "Raphael",
  "Rebecca",
  "Samuel",
  "Sarah",
  "Simon",
  "Sophie",
  "Talia",
  "Thomas",
  "Yael",
  "Zoe",
];
const LAST = [
  "Abitan",
  "Amar",
  "Azoulay",
  "Benaroch",
  "Bensimon",
  "Berger",
  "Cohen",
  "Dahan",
  "Elbaz",
  "Friedman",
  "Goldberg",
  "Haddad",
  "Israel",
  "Jacobs",
  "Katz",
  "Klein",
  "Lazar",
  "Levy",
  "Malka",
  "Mizrahi",
  "Nahon",
  "Ohayon",
  "Perez",
  "Rosen",
  "Sasson",
  "Segal",
  "Shapiro",
  "Stern",
  "Toledano",
  "Vidal",
  "Weiss",
  "Zerbib",
  "Tremblay",
  "Gagnon",
  "Roy",
  "Côté",
  "Bouchard",
  "Gauthier",
  "Morin",
  "Lavoie",
];
const PLACES: [string, string][] = [
  ["Montreal", "Canada"],
  ["Toronto", "Canada"],
  ["Ottawa", "Canada"],
  ["Vancouver", "Canada"],
  ["Quebec City", "Canada"],
  ["New York", "USA"],
  ["Boston", "USA"],
  ["Miami", "USA"],
  ["Los Angeles", "USA"],
  ["Tel Aviv", "Israel"],
  ["Jerusalem", "Israel"],
  ["Paris", "France"],
  ["London", "United Kingdom"],
];
const SCHOOLS = [
  "McGill University",
  "Concordia University",
  "Université de Montréal",
  "University of Toronto",
  "Queen’s University",
  "HEC Montréal",
  "Université Laval",
  "Technion",
  "NYU",
  "Harvard University",
];
const JOBS: [string, string][] = [
  ["Family Physician", "CIUSSS"],
  ["Lawyer", "Fasken"],
  ["Software Engineer", "Shopify"],
  ["Analyst", "CDPQ"],
  ["Founder", "Self-employed"],
  ["Architect", "Lemay"],
  ["Engineer", "WSP"],
  ["Consultant", "Deloitte"],
  ["Teacher", "EMSB"],
  ["Product Manager", "Coveo"],
  ["Accountant", "KPMG"],
];

// Small seeded generator, so every run produces the same people.
function generator(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T>(list: readonly T[], random: () => number): T =>
  list[Math.floor(random() * list.length)]!;
const id = (kind: string, school: number, n: number) =>
  `99999999-${kind}00${school}-4000-8000-${n.toString(16).padStart(12, "0")}`;

function check(table: string, { error }: { error: { message: string } | null }) {
  if (error) throw new Error(`${table}: ${error.message}`);
}

// Ordered lookups keep the generated data identical from one run to the next.
const { data: schools, error: schoolsError } = await db
  .from("institutions")
  .select("id, slug")
  .in("slug", ["herzliah", "test-school"])
  .order("slug");
const { data: careers } = await db
  .from("career_fields")
  .select("id")
  .is("institution_id", null)
  .order("key");
const { data: offers } = await db
  .from("offer_types")
  .select("id")
  .is("institution_id", null)
  .order("key");
if (schoolsError || schools?.length !== 2 || !careers?.length || !offers?.length) {
  console.error("Seed the local stack first: `supabase db reset`.");
  process.exit(1);
}

const started = Date.now();
const now = new Date().toISOString();
const dueAt = new Date(Date.now() + 365 * 86_400_000).toISOString();
const skipExisting = { onConflict: "id", ignoreDuplicates: true };
for (const [index, school] of schools.entries()) {
  const random = generator(index + 1);
  for (let from = 1; from <= count; from += BATCH) {
    const profiles: Insert<"alumni_profiles">[] = [];
    const education: Insert<"alumni_education">[] = [];
    const experience: Insert<"alumni_experience">[] = [];
    const channels: Insert<"profile_contact_channels">[] = [];
    const profileOffers: Insert<"profile_offers">[] = [];
    for (let n = from; n < Math.min(from + BATCH, count + 1); n++) {
      const profileId = id("0", index + 1, n);
      const first = pick(FIRST, random);
      const last = pick(LAST, random);
      const [city, country] = pick(PLACES, random);
      const [jobTitle, employer] = pick(JOBS, random);
      const gradYear = 1960 + Math.floor(random() * 66);
      const careerFieldId = pick(careers, random).id;
      profiles.push({
        id: profileId,
        institution_id: school.id,
        status: "active",
        visibility: "members",
        first_name: first,
        last_name: last,
        grad_year: gradYear,
        city,
        country,
        job_title: jobTitle,
        employer,
        career_field_id: careerFieldId,
        languages: random() < 0.6 ? ["en", "fr"] : ["en"],
        onboarding_step: 7,
        onboarding_completed_at: now,
        published_at: now,
        last_confirmed_at: now,
        confirmation_due_at: dueAt,
      });
      education.push({
        id: id("e", index + 1, n),
        profile_id: profileId,
        institution_id: school.id,
        school: pick(SCHOOLS, random),
        graduation_year: Math.min(gradYear + 4, 2026),
        sort_order: 1,
      });
      experience.push({
        id: id("a", index + 1, n),
        profile_id: profileId,
        institution_id: school.id,
        job_title: jobTitle,
        employer,
        career_field_id: careerFieldId,
        location: city,
        is_current: true,
        sort_order: 1,
      });
      const handle = `${first}.${last}.${n}`
        .toLowerCase()
        .normalize("NFD")
        .replace(/[^a-z0-9.]/g, "");
      channels.push(
        {
          id: id("c", index + 1, n),
          profile_id: profileId,
          institution_id: school.id,
          type: "linkedin",
          value: `https://www.linkedin.com/in/${handle.replaceAll(".", "-")}`,
          is_public: true,
          sort_order: 1,
        },
        {
          id: id("d", index + 1, n),
          profile_id: profileId,
          institution_id: school.id,
          type: "email",
          value: `${handle}@example.test`,
          is_public: true,
          sort_order: 2,
        },
      );
      for (const offer of offers) {
        if (random() < 0.2)
          profileOffers.push({
            profile_id: profileId,
            offer_type_id: offer.id,
            institution_id: school.id,
          });
      }
    }
    check("alumni_profiles", await db.from("alumni_profiles").upsert(profiles, skipExisting));
    check("alumni_education", await db.from("alumni_education").upsert(education, skipExisting));
    check("alumni_experience", await db.from("alumni_experience").upsert(experience, skipExisting));
    check(
      "profile_contact_channels",
      await db.from("profile_contact_channels").upsert(channels, skipExisting),
    );
    check(
      "profile_offers",
      await db
        .from("profile_offers")
        .upsert(profileOffers, { onConflict: "profile_id,offer_type_id", ignoreDuplicates: true }),
    );
    process.stdout.write(`\r${school.slug}: ${Math.min(from + BATCH - 1, count)} / ${count}`);
  }
  process.stdout.write("\n");
}
console.log(`Done in ${((Date.now() - started) / 1000).toFixed(1)} s.`);
