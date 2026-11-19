import type { PublicSchool } from "@/lib/database";

// public_school(slug) results, cached per server instance so the proxy does not query the database on every
// request. A renamed or suspended school shows within a minute; random subdomains cannot grow the cache past
// MAX_ENTRIES. Failed lookups are not cached.
const FOUND_TTL_MS = 60_000;
const MISSING_TTL_MS = 15_000;
const MAX_ENTRIES = 500;
const cache = new Map<string, { school: PublicSchool | null; expires: number }>();

export async function lookupSchool(
  slug: string,
  fetchSchool: (slug: string) => Promise<PublicSchool | null>,
  now = Date.now(),
): Promise<PublicSchool | null> {
  const hit = cache.get(slug);
  if (hit && hit.expires > now) return hit.school;
  const school = await fetchSchool(slug);
  cache.delete(slug);
  if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value!);
  cache.set(slug, { school, expires: now + (school ? FOUND_TTL_MS : MISSING_TTL_MS) });
  return school;
}

export function clearSchoolCache() {
  cache.clear();
}
