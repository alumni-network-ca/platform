// The school of the current address, as public_school() returns it. Shared by server and client code.
import type { PublicSchool } from "@/lib/database";

export type { PublicSchool };

/** Display names, logo and tab icon from institutions.branding, with fallbacks for a school that set none. */
export function schoolBranding(school: PublicSchool) {
  const branding =
    school.branding && typeof school.branding === "object" && !Array.isArray(school.branding)
      ? school.branding
      : {};
  const shortName =
    typeof branding.short_name === "string" && branding.short_name.trim()
      ? branding.short_name.trim()
      : school.name;
  // Only files on this site: the database also accepts https addresses, which the app does not load yet.
  const sitePath = (value: unknown) =>
    typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : null;
  return {
    shortName,
    networkName: `${shortName} Alumni Network`,
    logo: sitePath(branding.logo),
    favicon: sitePath(branding.favicon),
  };
}

/**
 * The school as proxy.ts passes it in a request header. Branding is left out: getSchool() adds it from the cached
 * config (lib/tenant/config.ts), which a change clears on every server at once.
 */
export type SchoolHeader = Omit<PublicSchool, "branding">;

// Header values must be ASCII, and school names are not ("Université"), so the JSON is URI-encoded.
export function encodeSchool({ id, name, slug, default_locale }: PublicSchool): string {
  return encodeURIComponent(JSON.stringify({ id, name, slug, default_locale }));
}

export function decodeSchool(raw: string | null): SchoolHeader | null {
  if (!raw) return null;
  const value: unknown = JSON.parse(decodeURIComponent(raw));
  return value && typeof value === "object" && "id" in value && "slug" in value && "name" in value
    ? (value as SchoolHeader)
    : null;
}
