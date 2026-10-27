import { describe, expect, it } from "vitest";
import { resolveTenant, type TenantInput } from "./host";

const production = { rootDomain: "alumninetwork.ca", isPreview: false };
const staging = { rootDomain: "staging.alumninetwork.ca", isPreview: false };
const local = { rootDomain: "localhost", isPreview: false };
const preview = { rootDomain: "alumninetwork.ca", isPreview: true, previewDefault: "herzliah" };

const school = (slug: string) => ({ kind: "school", slug });
const root = { kind: "root" };
const none = { kind: "none" };

describe("resolveTenant", () => {
  it.each<[string, Omit<TenantInput, "host">, string, object]>([
    ["a school subdomain", production, "herzliah.alumninetwork.ca", school("herzliah")],
    ["a hyphenated slug", production, "test-school.alumninetwork.ca", school("test-school")],
    ["upper case and a trailing dot", production, "Herzliah.AlumniNetwork.ca.", school("herzliah")],
    ["the bare domain", production, "alumninetwork.ca", root],
    ["www", production, "www.alumninetwork.ca", root],
    ["a nested subdomain", production, "a.b.alumninetwork.ca", none],
    ["a one-letter label (slugs need 2+)", production, "x.alumninetwork.ca", none],
    ["another domain", production, "herzliah.evil.example", none],
    ["a look-alike domain", production, "herzliah.alumninetwork.ca.evil.example", none],
    ["no host header", production, "", none],
    ["staging", staging, "herzliah.staging.alumninetwork.ca", school("herzliah")],
    ["the staging root", staging, "staging.alumninetwork.ca", root],
    ["local with a port", local, "herzliah.localhost:3000", school("herzliah")],
    ["plain localhost", local, "localhost:3000", root],
    ["127.0.0.1", local, "127.0.0.1:3000", none],
  ])("%s", (_, env, host, expected) => {
    expect(resolveTenant({ ...env, host })).toEqual(expected);
  });

  it("ignores the tenant cookie outside previews, so forging it has no effect", () => {
    expect(
      resolveTenant({
        ...production,
        host: "herzliah.alumninetwork.ca",
        previewCookie: "test-school",
      }),
    ).toEqual(school("herzliah"));
    expect(
      resolveTenant({
        ...production,
        host: "platform-abc.vercel.app",
        previewCookie: "test-school",
      }),
    ).toEqual(none);
  });

  it("uses the tenant cookie on a preview host", () => {
    expect(
      resolveTenant({ ...preview, host: "platform-abc.vercel.app", previewCookie: "test-school" }),
    ).toEqual(school("test-school"));
  });

  it("falls back to the preview default when the cookie is missing or not a slug", () => {
    expect(resolveTenant({ ...preview, host: "platform-abc.vercel.app" })).toEqual(
      school("herzliah"),
    );
    expect(
      resolveTenant({ ...preview, host: "platform-abc.vercel.app", previewCookie: "../x" }),
    ).toEqual(school("herzliah"));
  });

  it("still resolves real subdomains on a preview deployment", () => {
    expect(
      resolveTenant({
        ...preview,
        host: "test-school.alumninetwork.ca",
        previewCookie: "herzliah",
      }),
    ).toEqual(school("test-school"));
  });
});
