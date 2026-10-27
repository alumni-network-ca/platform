// Directory search timing (QA-06): signs in as the local alumnus and calls search_directory through the API,
// as the app does, so RLS, PostgREST and the network hop are all included. Prints p50/p95 per filter.
//
//   npm run seed:perf && npm run bench:directory
//   npm run bench:directory -- --runs 100
//
// Local stack only. Target (DIR-01): p95 under 300 ms at 10,000 profiles per school.
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { accounts, LOCAL_PASSWORD } from "../e2e/fixtures/accounts.ts";
import { isLocal, localStack } from "./lib/supabase-admin.ts";
import type { Database, Json } from "@/lib/database";

const { values } = parseArgs({ options: { runs: { type: "string", default: "50" } } });
const runs = Number(values.runs);
const stack = localStack();
if (!isLocal(stack.url)) throw new Error("The benchmark only runs on the local stack.");

const db = createClient<Database>(stack.url, stack.publishableKey, {
  auth: { persistSession: false },
});
const { error: signInError } = await db.auth.signInWithPassword({
  email: accounts.alumni,
  password: LOCAL_PASSWORD,
});
if (signInError) throw new Error(`Sign-in failed: ${signInError.message}`);
const { data: school } = await db.rpc("public_school", { p_slug: "herzliah" });
if (!school) throw new Error("Seed the local stack first: `supabase db reset`.");

const cases: [string, Json, number][] = [
  ["first page, no filter", {}, 0],
  ["page 10, no filter", {}, 216],
  ["text: cohen", { q: "cohen" }, 0],
  ["career field + city", { career_field: "law", city: "Montreal" }, 0],
  ["offer: mentoring", { offer: "mentoring" }, 0],
  ["class of 1995", { grad_year: "1995" }, 0],
  ["school: McGill", { school: "McGill University" }, 0],
];

const percentile = (sorted: number[], p: number) =>
  sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)]!;

console.log(`search_directory as ${accounts.alumni}, ${runs} runs per case\n`);
console.log("case".padEnd(24), "matches".padStart(8), "p50 ms".padStart(8), "p95 ms".padStart(8));
for (const [name, filters, offset] of cases) {
  const call = () =>
    db.rpc("search_directory", {
      p_inst: school.id,
      p_filters: filters,
      p_limit: 24,
      p_offset: offset,
    });
  for (let i = 0; i < 3; i++) await call(); // warm-up
  const times: number[] = [];
  let matches = 0;
  let failure = "";
  for (let i = 0; i < runs && !failure; i++) {
    const started = performance.now();
    const { data, error } = await call();
    times.push(performance.now() - started);
    if (error) failure = error.message;
    else matches = data[0]?.total_count ?? 0;
  }
  if (failure) {
    console.log(name.padEnd(24), `failed: ${failure}`);
    continue;
  }
  times.sort((a, b) => a - b);
  console.log(
    name.padEnd(24),
    String(matches).padStart(8),
    percentile(times, 0.5).toFixed(0).padStart(8),
    percentile(times, 0.95).toFixed(0).padStart(8),
  );
}
