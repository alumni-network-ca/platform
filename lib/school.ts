// The school of the current address, as public_school() returns it. Shared by server and client code.
import type { PublicSchool } from "@/lib/database";

export type { PublicSchool };

/** Display names and logo from institutions.branding, with fallbacks for a school that set none. */
export function schoolBranding(school: PublicSchool) {
  const branding =
    school.branding && typeof school.branding === "object" && !Array.isArray(school.branding)
      ? school.branding
      : {};
  const shortName =
    typeof branding.short_name === "string" && branding.short_name.trim()
      ? branding.short_name.trim()
      : school.name;
  const logo =
    typeof branding.logo === "string" && branding.logo.startsWith("/") ? branding.logo : null;
  return { shortName, networkName: `${shortName} Alumni Network`, logo };
}

// proxy.ts passes the school to server components in a request header. Header values must be ASCII, and
// school names are not ("Université"), so the JSON is URI-encoded.
export function encodeSchool(school: PublicSchool): string {
  return encodeURIComponent(JSON.stringify(school));
}

export function decodeSchool(raw: string | null): PublicSchool | null {
  if (!raw) return null;
  const value: unknown = JSON.parse(decodeURIComponent(raw));
  return value && typeof value === "object" && "id" in value && "slug" in value && "name" in value
    ? (value as PublicSchool)
    : null;
}
