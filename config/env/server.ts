// Server and proxy variables that are not secret. No `server-only` marker, because proxy.ts imports this file; a
// browser import would only see the defaults. Secrets go in ./secrets.ts.

export const serverEnv = {
  /** The domain schools are subdomains of (ADR 0001): herzliah.<rootDomain>. */
  get rootDomain() {
    return process.env.ROOT_DOMAIN ?? "localhost";
  },
  /** True only on Vercel PR previews, which pick the school with the tenant cookie. */
  get isPreview() {
    return process.env.VERCEL_ENV === "preview";
  },
  /** This build's commit, set by Vercel. Part of every cross-request cache key, so a deploy starts a fresh cache. */
  get deploymentId() {
    return process.env.VERCEL_GIT_COMMIT_SHA ?? "local";
  },
  /** The school a PR preview shows when no tenant cookie is set. */
  get previewDefaultSchool() {
    return process.env.PREVIEW_DEFAULT_SCHOOL ?? "herzliah";
  },
};
